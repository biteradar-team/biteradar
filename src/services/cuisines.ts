import 'server-only';
import {eq, sql} from 'drizzle-orm';
import {db} from '@/src/db';
import {cuisines} from '@/src/db/schema';

/**
 * Canonical-cuisine read path (blueprint §13 kategorija landing pages). Cuisines
 * are seeded reference data; a location's cuisines are auto-derived into
 * `restaurant_cuisines` from its menu's dish links (seed-dishes.ts + the write
 * path). The /kuhinja pages read this; the actual location list reuses
 * `listPublishedLocations({cuisine})`.
 */

export type Cuisine = {id: string; slug: string; nameSr: string; nameEn: string};

/** Resolve a cuisine by slug, or null (→ 404 on the page). */
export async function getCuisineBySlug(slug: string): Promise<Cuisine | null> {
  const [row] = await db
    .select({id: cuisines.id, slug: cuisines.slug, nameSr: cuisines.nameSr, nameEn: cuisines.nameEn})
    .from(cuisines)
    .where(eq(cuisines.slug, slug))
    .limit(1);
  return row ?? null;
}

/**
 * Cuisines that have at least one published location — powers the /kuhinje index
 * and the sitemap. Skipping empty cuisines keeps thin pages out of both.
 */
export async function listCuisinesWithLocations(): Promise<Cuisine[]> {
  return db
    .select({id: cuisines.id, slug: cuisines.slug, nameSr: cuisines.nameSr, nameEn: cuisines.nameEn})
    .from(cuisines)
    .where(
      sql`exists (
        select 1 from restaurant_cuisines rc
        join restaurant_locations l on l.restaurant_id = rc.restaurant_id
        where rc.cuisine_id = ${cuisines.id} and l.status = 'published'
      )`,
    )
    .orderBy(cuisines.nameSr);
}
