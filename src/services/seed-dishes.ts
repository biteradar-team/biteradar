/**
 * Seed canonical `cuisines` + `dishes`, then derive the links
 * (`menu_items.dish_id` + `restaurant_cuisines`) — blueprint §3.1 (dish price
 * pages) and §13 (kategorija landing pages).
 *
 * Idempotent: upserts by slug, re-links every menu item (matchDish) and
 * re-derives restaurant_cuisines. New locations link + derive automatically on
 * write (insertChildren); this script is the initial seed + a re-link for rows
 * entered before a dish/cuisine existed.
 *
 * Run: npm run db:seed-dishes  (needs DATABASE_URL in .env.local). Uses raw
 * `postgres` like the smoke scripts — the app `db` (server-only) can't be
 * imported into a node script. COMMITS.
 *
 * Reference data (public repo — no personal data). `nameEn` follows the §i18n
 * rule: original name + an English gloss for tourists.
 */
import postgres from 'postgres';
import {normalize} from '../search/normalize';
import {matchDish, type DishCandidate} from '../search/dish-match';

type Cuisine = {slug: string; nameSr: string; nameEn: string};
type SeedDish = {slug: string; nameSr: string; nameEn: string; cuisineSlug: string};

// ~8 browse categories (blueprint §13 "kategorija").
const CUISINES: Cuisine[] = [
  {slug: 'rostilj', nameSr: 'Roštilj', nameEn: 'Grill'},
  {slug: 'italijanska', nameSr: 'Italijanska', nameEn: 'Italian'},
  {slug: 'domaca-kuhinja', nameSr: 'Domaća kuhinja', nameEn: 'Home cooking'},
  {slug: 'riba', nameSr: 'Riba', nameEn: 'Fish & seafood'},
  {slug: 'pekara', nameSr: 'Pekara', nameEn: 'Bakery'},
  {slug: 'salate', nameSr: 'Salate', nameEn: 'Salads'},
  {slug: 'slatko', nameSr: 'Slatko', nameEn: 'Desserts'},
  {slug: 'brza-hrana', nameSr: 'Brza hrana', nameEn: 'Fast food'},
];

// ~25 common Serbian restaurant dishes → cuisine. Keep slugs stable (public URLs).
const DISHES: SeedDish[] = [
  {slug: 'cevapi', nameSr: 'Ćevapi', nameEn: 'Ćevapi — grilled minced meat rolls', cuisineSlug: 'rostilj'},
  {slug: 'pljeskavica', nameSr: 'Pljeskavica', nameEn: 'Pljeskavica — Serbian burger patty', cuisineSlug: 'rostilj'},
  {slug: 'punjena-pljeskavica', nameSr: 'Punjena pljeskavica', nameEn: 'Stuffed pljeskavica', cuisineSlug: 'rostilj'},
  {slug: 'karadjordjeva', nameSr: 'Karađorđeva šnicla', nameEn: 'Karađorđeva — breaded stuffed roll', cuisineSlug: 'rostilj'},
  {slug: 'raznjici', nameSr: 'Ražnjići', nameEn: 'Ražnjići — grilled meat skewers', cuisineSlug: 'rostilj'},
  {slug: 'vesalica', nameSr: 'Vešalica', nameEn: 'Vešalica — grilled pork loin', cuisineSlug: 'rostilj'},
  {slug: 'mesano-meso', nameSr: 'Mešano meso', nameEn: 'Mixed grilled meat', cuisineSlug: 'rostilj'},
  {slug: 'becka-snicla', nameSr: 'Bečka šnicla', nameEn: 'Wiener schnitzel', cuisineSlug: 'rostilj'},
  {slug: 'pileci-file', nameSr: 'Pileći file', nameEn: 'Chicken fillet', cuisineSlug: 'rostilj'},
  {slug: 'rostilj', nameSr: 'Roštilj', nameEn: 'Roštilj — mixed grill', cuisineSlug: 'rostilj'},
  {slug: 'burger', nameSr: 'Burger', nameEn: 'Burger', cuisineSlug: 'brza-hrana'},
  {slug: 'pomfrit', nameSr: 'Pomfrit', nameEn: 'French fries', cuisineSlug: 'brza-hrana'},
  {slug: 'pica', nameSr: 'Pica', nameEn: 'Pizza', cuisineSlug: 'italijanska'},
  {slug: 'pasta', nameSr: 'Pasta', nameEn: 'Pasta', cuisineSlug: 'italijanska'},
  {slug: 'sarma', nameSr: 'Sarma', nameEn: 'Sarma — cabbage rolls', cuisineSlug: 'domaca-kuhinja'},
  {slug: 'pasulj', nameSr: 'Pasulj', nameEn: 'Pasulj — bean stew', cuisineSlug: 'domaca-kuhinja'},
  {slug: 'gulas', nameSr: 'Gulaš', nameEn: 'Goulash', cuisineSlug: 'domaca-kuhinja'},
  {slug: 'kajmak', nameSr: 'Kajmak', nameEn: 'Kajmak — clotted cream spread', cuisineSlug: 'domaca-kuhinja'},
  {slug: 'riblja-corba', nameSr: 'Riblja čorba', nameEn: 'Fish soup', cuisineSlug: 'riba'},
  {slug: 'burek', nameSr: 'Burek', nameEn: 'Burek — filled pastry', cuisineSlug: 'pekara'},
  {slug: 'gibanica', nameSr: 'Gibanica', nameEn: 'Gibanica — cheese pie', cuisineSlug: 'pekara'},
  {slug: 'proja', nameSr: 'Proja', nameEn: 'Proja — cornbread', cuisineSlug: 'pekara'},
  {slug: 'palacinke', nameSr: 'Palačinke', nameEn: 'Palačinke — crepes', cuisineSlug: 'slatko'},
  {slug: 'sopska-salata', nameSr: 'Šopska salata', nameEn: 'Shopska salad', cuisineSlug: 'salate'},
  {slug: 'srpska-salata', nameSr: 'Srpska salata', nameEn: 'Serbian salad', cuisineSlug: 'salate'},
];

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set (put it in .env.local).');
}
const sql = postgres(url, {prepare: false});

async function main() {
  // 1. Upsert cuisines.
  for (const c of CUISINES) {
    await sql`
      insert into cuisines (slug, name_sr, name_en)
      values (${c.slug}, ${c.nameSr}, ${c.nameEn})
      on conflict (slug) do update set
        name_sr = excluded.name_sr, name_en = excluded.name_en`;
  }

  // 2. Upsert dishes (normalized_text via the app normalize(); cuisine by slug).
  for (const d of DISHES) {
    await sql`
      insert into dishes (slug, name_sr, name_en, normalized_text, cuisine_id)
      values (${d.slug}, ${d.nameSr}, ${d.nameEn}, ${normalize(d.nameSr)},
              (select id from cuisines where slug = ${d.cuisineSlug}))
      on conflict (slug) do update set
        name_sr = excluded.name_sr,
        name_en = excluded.name_en,
        normalized_text = excluded.normalized_text,
        cuisine_id = excluded.cuisine_id`;
  }

  // 3. Backfill dish_id on every menu item by matching its NAME (matchDish).
  const candidates: DishCandidate[] = (
    await sql`select id, normalized_text from dishes`
  ).map((r) => ({id: r.id, normalizedName: r.normalized_text ?? ''}));

  const items = await sql`select id, name from menu_items`;
  let linked = 0;
  // ponytail: per-row update, fine at MVP scale; batch by dish_id if it grows.
  for (const it of items) {
    const dishId = matchDish(it.name, candidates);
    await sql`update menu_items set dish_id = ${dishId} where id = ${it.id}`;
    if (dishId) linked++;
  }

  // 4. Derive restaurant_cuisines from the (now linked) menu dishes — the same
  // shape insertChildren uses on write. Additive; re-runnable.
  const derived = await sql`
    insert into restaurant_cuisines (restaurant_id, cuisine_id)
    select distinct l.restaurant_id, d.cuisine_id
    from menu_items mi
    join restaurant_locations l on l.id = mi.location_id
    join dishes d on d.id = mi.dish_id
    where d.cuisine_id is not null
    on conflict (restaurant_id, cuisine_id) do nothing
    returning restaurant_id`;

  console.log(
    `✅ Seeded ${CUISINES.length} cuisines + ${DISHES.length} dishes; ` +
      `linked ${linked}/${items.length} menu items; ` +
      `derived ${derived.length} restaurant-cuisine links.`,
  );
  await sql.end();
}

main().catch(async (err) => {
  await sql.end();
  console.error('❌ Dish/cuisine seed failed');
  console.error(err);
  process.exit(1);
});
