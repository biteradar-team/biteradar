/**
 * Seed the canonical `dishes` table + backfill `menu_items.dish_id`
 * (blueprint §3.1 — the price-comparison differentiator groups free-text menu
 * items under canonical dishes).
 *
 * Idempotent: upserts by slug, so re-running updates names/normalization and
 * re-links every existing menu item via matchDish(). New locations link
 * automatically on write (insertChildren) — this script is for the initial seed
 * and for re-linking rows entered before a dish existed.
 *
 * Run: npm run db:seed-dishes  (needs DATABASE_URL in .env.local). Uses raw
 * `postgres` like the smoke scripts — importing the app `db` (server-only) into
 * a node script throws. COMMITS (unlike the rollback-only smokes).
 *
 * Dishes are generic reference data (public repo — no personal data). `nameEn`
 * follows the §i18n rule: original name + an English gloss for tourists.
 */
import postgres from 'postgres';
import {normalize} from '../search/normalize';
import {matchDish, type DishCandidate} from '../search/dish-match';

type SeedDish = {slug: string; nameSr: string; nameEn: string};

// ~25 common Serbian restaurant dishes. Keep slugs stable — they're public URLs.
const DISHES: SeedDish[] = [
  {slug: 'cevapi', nameSr: 'Ćevapi', nameEn: 'Ćevapi — grilled minced meat rolls'},
  {slug: 'pljeskavica', nameSr: 'Pljeskavica', nameEn: 'Pljeskavica — Serbian burger patty'},
  {slug: 'punjena-pljeskavica', nameSr: 'Punjena pljeskavica', nameEn: 'Stuffed pljeskavica'},
  {slug: 'karadjordjeva', nameSr: 'Karađorđeva šnicla', nameEn: 'Karađorđeva — breaded stuffed roll'},
  {slug: 'raznjici', nameSr: 'Ražnjići', nameEn: 'Ražnjići — grilled meat skewers'},
  {slug: 'vesalica', nameSr: 'Vešalica', nameEn: 'Vešalica — grilled pork loin'},
  {slug: 'mesano-meso', nameSr: 'Mešano meso', nameEn: 'Mixed grilled meat'},
  {slug: 'becka-snicla', nameSr: 'Bečka šnicla', nameEn: 'Wiener schnitzel'},
  {slug: 'burger', nameSr: 'Burger', nameEn: 'Burger'},
  {slug: 'pica', nameSr: 'Pica', nameEn: 'Pizza'},
  {slug: 'pasta', nameSr: 'Pasta', nameEn: 'Pasta'},
  {slug: 'sarma', nameSr: 'Sarma', nameEn: 'Sarma — cabbage rolls'},
  {slug: 'pasulj', nameSr: 'Pasulj', nameEn: 'Pasulj — bean stew'},
  {slug: 'gulas', nameSr: 'Gulaš', nameEn: 'Goulash'},
  {slug: 'riblja-corba', nameSr: 'Riblja čorba', nameEn: 'Fish soup'},
  {slug: 'burek', nameSr: 'Burek', nameEn: 'Burek — filled pastry'},
  {slug: 'gibanica', nameSr: 'Gibanica', nameEn: 'Gibanica — cheese pie'},
  {slug: 'palacinke', nameSr: 'Palačinke', nameEn: 'Palačinke — crepes'},
  {slug: 'sopska-salata', nameSr: 'Šopska salata', nameEn: 'Shopska salad'},
  {slug: 'srpska-salata', nameSr: 'Srpska salata', nameEn: 'Serbian salad'},
  {slug: 'pomfrit', nameSr: 'Pomfrit', nameEn: 'French fries'},
  {slug: 'pileci-file', nameSr: 'Pileći file', nameEn: 'Chicken fillet'},
  {slug: 'rostilj', nameSr: 'Roštilj', nameEn: 'Roštilj — mixed grill'},
  {slug: 'kajmak', nameSr: 'Kajmak', nameEn: 'Kajmak — clotted cream spread'},
  {slug: 'proja', nameSr: 'Proja', nameEn: 'Proja — cornbread'},
];

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set (put it in .env.local).');
}
const sql = postgres(url, {prepare: false});

async function main() {
  // 1. Upsert dishes (normalized_text via the app normalize(), single SoT).
  for (const d of DISHES) {
    await sql`
      insert into dishes (slug, name_sr, name_en, normalized_text)
      values (${d.slug}, ${d.nameSr}, ${d.nameEn}, ${normalize(d.nameSr)})
      on conflict (slug) do update set
        name_sr = excluded.name_sr,
        name_en = excluded.name_en,
        normalized_text = excluded.normalized_text`;
  }

  // 2. Backfill dish_id on every menu item by matching its NAME (matchDish).
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

  console.log(
    `✅ Seeded ${DISHES.length} dishes; linked ${linked}/${items.length} menu items.`,
  );
  await sql.end();
}

main().catch(async (err) => {
  await sql.end();
  console.error('❌ Dish seed failed');
  console.error(err);
  process.exit(1);
});
