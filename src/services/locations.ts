import 'server-only';
import {eq, sql} from 'drizzle-orm';
import {db} from '@/src/db';
import {
  menuItemPrices,
  menuItems,
  openingHours,
  restaurantLocations,
  restaurants,
} from '@/src/db/schema';
import {normalize} from '@/src/search/normalize';
import {LocationInputSchema, slugify} from './location-input';

/**
 * Admin write path (blueprint §2: "podaci SU proizvod"). Creates a brand + one
 * physical location + weekly hours + a priced menu in a single transaction,
 * running every free-text field through `normalize()` so the rows are
 * searchable the instant they land (blueprint §8).
 *
 * SECURITY: `db` connects as the owner role and BYPASSES RLS (ADR 0001). There
 * is no row-level guard on these writes — the ONLY gate is `requireAdmin()`,
 * which the server action MUST call before this runs. Do not call this from an
 * unauthenticated path.
 */
export async function createLocation(
  input: unknown,
): Promise<{locationId: string; slug: string}> {
  const data = LocationInputSchema.parse(input);

  return db.transaction(async (tx) => {
    const slug = await uniqueSlug(tx, slugify(data.brand.name));

    const [brand] = await tx
      .insert(restaurants)
      .values({
        slug,
        name: data.brand.name,
        description: data.brand.description,
        normalizedText: normalize(
          [data.brand.name, data.brand.description].filter(Boolean).join(' '),
        ),
      })
      .returning({id: restaurants.id});

    const {lat, lng} = data.location;
    const [location] = await tx
      .insert(restaurantLocations)
      .values({
        restaurantId: brand.id,
        slug,
        name: data.location.label,
        city: data.location.city,
        address: data.location.address,
        geog: sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`,
        acceptsCards: data.location.acceptsCards,
        status: data.location.status,
      })
      .returning({id: restaurantLocations.id, slug: restaurantLocations.slug});

    // One row per OPEN day; a closed weekday is simply absent (schema requires
    // opens/closes NOT NULL — weekly closures are modeled by omission).
    const openRows = data.hours
      .filter((h) => !h.closed)
      .map((h) => ({
        locationId: location.id,
        dayOfWeek: h.day,
        opensAt: h.opensAt!,
        closesAt: h.closesAt!,
      }));
    if (openRows.length) await tx.insert(openingHours).values(openRows);

    for (const item of data.menu) {
      const [row] = await tx
        .insert(menuItems)
        .values({
          locationId: location.id,
          name: item.name,
          description: item.description,
          sectionName: item.sectionName,
          normalizedText: normalize(
            [item.name, item.sectionName, item.description]
              .filter(Boolean)
              .join(' '),
          ),
        })
        .returning({id: menuItems.id});
      await tx
        .insert(menuItemPrices)
        .values({menuItemId: row.id, amountRsd: item.priceRsd});
    }

    return {locationId: location.id, slug: location.slug};
  });
}

// Append -2, -3, … until the slug is free. Runs inside the txn; low write
// volume, so the tiny race window is acceptable (the unique index is the
// backstop). ponytail: linear probe, fine at this scale.
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function uniqueSlug(tx: Tx, base: string): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [existing] = await tx
      .select({id: restaurants.id})
      .from(restaurants)
      .where(eq(restaurants.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
}
