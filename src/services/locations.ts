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
import {
  type LocationEditData,
  type LocationInput,
  LocationInputSchema,
  slugify,
} from './location-input';

/**
 * Admin write path (blueprint §2: "podaci SU proizvod"). Creates / updates a
 * brand + one physical location + weekly hours + a priced menu in a single
 * transaction, running every free-text field through `normalize()` so the rows
 * are searchable the instant they land (blueprint §8).
 *
 * SECURITY: `db` connects as the owner role and BYPASSES RLS (ADR 0001). There
 * is no row-level guard on these writes — the ONLY gate is `requireAdmin()`,
 * which the server action MUST call before any of these run. Never call them
 * from an unauthenticated path.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
        normalizedText: brandText(data),
      })
      .returning({id: restaurants.id});

    const [location] = await tx
      .insert(restaurantLocations)
      .values({
        restaurantId: brand.id,
        slug,
        name: data.location.label,
        city: data.location.city,
        address: data.location.address,
        geog: geog(data),
        acceptsCards: data.location.acceptsCards,
        status: data.location.status,
      })
      .returning({id: restaurantLocations.id, slug: restaurantLocations.slug});

    await insertChildren(tx, location.id, data);
    return {locationId: location.id, slug: location.slug};
  });
}

export async function updateLocation(
  locationId: string,
  input: unknown,
): Promise<void> {
  const data = LocationInputSchema.parse(input);

  await db.transaction(async (tx) => {
    const [loc] = await tx
      .select({restaurantId: restaurantLocations.restaurantId})
      .from(restaurantLocations)
      .where(eq(restaurantLocations.id, locationId))
      .limit(1);
    if (!loc) throw new Error(`Location ${locationId} not found`);

    // Slug stays stable on edit — a name change must not churn the URL.
    await tx
      .update(restaurants)
      .set({
        name: data.brand.name,
        description: data.brand.description,
        normalizedText: brandText(data),
        updatedAt: new Date(),
      })
      .where(eq(restaurants.id, loc.restaurantId));

    await tx
      .update(restaurantLocations)
      .set({
        name: data.location.label,
        city: data.location.city,
        address: data.location.address,
        geog: geog(data),
        acceptsCards: data.location.acceptsCards,
        status: data.location.status,
        updatedAt: new Date(),
      })
      .where(eq(restaurantLocations.id, locationId));

    // ponytail: hours + menu are replaced wholesale (delete children, re-insert)
    // rather than diffed. This discards menu price history on every edit —
    // acceptable pre-launch (no meaningful history yet). Upgrade path: diff menu
    // rows and only append a new price when the amount actually changed.
    await tx.delete(openingHours).where(eq(openingHours.locationId, locationId));
    await tx.delete(menuItems).where(eq(menuItems.locationId, locationId));
    await insertChildren(tx, locationId, data);
  });
}

/** Deletes the whole brand; cascade removes its location, hours, menu + prices
 * (brand:location is 1:1 in this MVP). */
export async function deleteLocation(restaurantId: string): Promise<void> {
  await db.delete(restaurants).where(eq(restaurants.id, restaurantId));
}

/** Loads one location into the shape the admin form pre-fills from. */
export async function getLocationForEdit(
  locationId: string,
): Promise<LocationEditData | null> {
  const [row] = await db
    .select({
      brandName: restaurants.name,
      description: restaurants.description,
      label: restaurantLocations.name,
      city: restaurantLocations.city,
      address: restaurantLocations.address,
      status: restaurantLocations.status,
      acceptsCards: restaurantLocations.acceptsCards,
      lat: sql<number>`st_y(${restaurantLocations.geog}::geometry)`,
      lng: sql<number>`st_x(${restaurantLocations.geog}::geometry)`,
    })
    .from(restaurantLocations)
    .innerJoin(restaurants, eq(restaurants.id, restaurantLocations.restaurantId))
    .where(eq(restaurantLocations.id, locationId))
    .limit(1);
  if (!row) return null;

  const hours = await db
    .select({
      day: openingHours.dayOfWeek,
      opensAt: openingHours.opensAt,
      closesAt: openingHours.closesAt,
    })
    .from(openingHours)
    .where(eq(openingHours.locationId, locationId));

  const menu = await db
    .select({
      name: menuItems.name,
      sectionName: menuItems.sectionName,
      description: menuItems.description,
      // current price = latest valid_from (schema §7)
      priceRsd: sql<number>`(
        select amount_rsd from menu_item_prices p
        where p.menu_item_id = ${menuItems.id}
        order by valid_from desc limit 1
      )`,
    })
    .from(menuItems)
    .where(eq(menuItems.locationId, locationId))
    .orderBy(menuItems.sortOrder);

  return {
    brand: {name: row.brandName, description: row.description ?? ''},
    location: {
      label: row.label ?? '',
      city: row.city,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      acceptsCards:
        row.acceptsCards === null ? 'unknown' : row.acceptsCards ? 'yes' : 'no',
      status: row.status === 'published' ? 'published' : 'draft',
    },
    // Postgres `time` comes back as HH:MM:SS; the <input type="time"> wants HH:MM.
    hours: hours.map((h) => ({
      day: h.day,
      opensAt: h.opensAt.slice(0, 5),
      closesAt: h.closesAt.slice(0, 5),
    })),
    menu: menu.map((m) => ({
      name: m.name,
      sectionName: m.sectionName ?? '',
      description: m.description ?? '',
      priceRsd: String(m.priceRsd ?? ''),
    })),
  };
}

// --- shared helpers ---------------------------------------------------------

const brandText = (d: LocationInput) =>
  normalize([d.brand.name, d.brand.description].filter(Boolean).join(' '));

const geog = (d: LocationInput) =>
  sql`ST_SetSRID(ST_MakePoint(${d.location.lng}, ${d.location.lat}), 4326)::geography`;

// Insert the hours + menu that hang off a location. One row per OPEN day (a
// closed weekday is simply absent — schema requires opens/closes NOT NULL).
async function insertChildren(tx: Tx, locationId: string, data: LocationInput) {
  const openRows = data.hours
    .filter((h) => !h.closed)
    .map((h) => ({
      locationId,
      dayOfWeek: h.day,
      opensAt: h.opensAt!,
      closesAt: h.closesAt!,
    }));
  if (openRows.length) await tx.insert(openingHours).values(openRows);

  for (const [i, item] of data.menu.entries()) {
    const [row] = await tx
      .insert(menuItems)
      .values({
        locationId,
        name: item.name,
        description: item.description,
        sectionName: item.sectionName,
        sortOrder: i,
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
}

// Append -2, -3, … until the slug is free. Runs inside the txn; low write
// volume, so the tiny race window is acceptable (the unique index is the
// backstop). ponytail: linear probe, fine at this scale.
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
