import 'server-only';
import {and, eq, sql} from 'drizzle-orm';
import {db} from '@/src/db';
import {
  dishes,
  menuItems,
  restaurantLocations,
  restaurants,
} from '@/src/db/schema';
import {type City} from '@/src/lib/cities';

/**
 * Canonical-dish read path (blueprint §3.1). Dishes are seeded reference data
 * (src/services/seed-dishes.ts) and menu items are auto-linked to them via
 * `dish_id` (matchDish, on write + backfill). These power the /jelo price page
 * and the /jela index.
 *
 * TRUST BOUNDARY: like the rest of the service layer, `db` bypasses RLS, so the
 * `status = 'published'` predicate on the OFFERS is what keeps drafts off the
 * public pages. Dishes themselves are world-readable reference data.
 */

export type Dish = {id: string; slug: string; nameSr: string; nameEn: string | null};

export type DishOffer = {
  slug: string;
  brandName: string;
  label: string | null;
  city: City;
  address: string;
  itemName: string;
  priceRsd: number | null;
};

/** Resolve a dish by its URL slug, or null (→ 404 on the page). */
export async function getDishBySlug(slug: string): Promise<Dish | null> {
  const [row] = await db
    .select({id: dishes.id, slug: dishes.slug, nameSr: dishes.nameSr, nameEn: dishes.nameEn})
    .from(dishes)
    .where(eq(dishes.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * Every published menu item linked to `dishId`, CHEAPEST FIRST — the §3.1
 * price-comparison payload. Optional NS/BG narrowing.
 */
export async function listDishOffers(params: {
  dishId: string;
  city?: City;
}): Promise<DishOffer[]> {
  const price = sql<number | null>`(
    select amount_rsd from menu_item_prices p
    where p.menu_item_id = ${menuItems.id}
    order by valid_from desc limit 1
  )`;

  const rows = await db
    .select({
      slug: restaurantLocations.slug,
      brandName: restaurants.name,
      label: restaurantLocations.name,
      city: restaurantLocations.city,
      address: restaurantLocations.address,
      itemName: menuItems.name,
      priceRsd: price,
    })
    .from(menuItems)
    .innerJoin(restaurantLocations, eq(restaurantLocations.id, menuItems.locationId))
    .innerJoin(restaurants, eq(restaurants.id, restaurantLocations.restaurantId))
    .where(
      and(
        eq(menuItems.dishId, params.dishId),
        eq(restaurantLocations.status, 'published'),
        params.city ? eq(restaurantLocations.city, params.city) : undefined,
      ),
    )
    .orderBy(sql`${price} asc nulls last`, restaurants.name);

  return rows.map((r) => ({
    slug: r.slug,
    brandName: r.brandName,
    label: r.label ?? null,
    city: r.city,
    address: r.address,
    itemName: r.itemName,
    priceRsd: r.priceRsd === null ? null : Number(r.priceRsd),
  }));
}

/**
 * Dishes that have at least one published offer — powers the /jela index and
 * the sitemap. Skipping offerless dishes keeps thin/empty pages out of both.
 */
export async function listDishesWithOffers(): Promise<Dish[]> {
  const rows = await db
    .select({id: dishes.id, slug: dishes.slug, nameSr: dishes.nameSr, nameEn: dishes.nameEn})
    .from(dishes)
    .where(
      sql`exists (
        select 1 from menu_items mi
        join restaurant_locations l on l.id = mi.location_id
        where mi.dish_id = ${dishes.id} and l.status = 'published'
      )`,
    )
    .orderBy(dishes.nameSr);
  return rows;
}
