/**
 * RLS smoke test — the proof that public read access is actually locked down.
 *
 * Seeds a brand with one published + one draft location (and their menu items
 * and prices) as the migration/owner role, then switches to the Supabase
 * `anon` role and asserts a visitor sees ONLY the published content. Everything
 * runs inside a transaction that is always rolled back, so no fake data is
 * persisted (this repo is public — blueprint §"Secrets & data").
 *
 * Run: npm run db:smoke  (needs DATABASE_URL in .env.local, and the Supabase
 * `anon` role — i.e. run it against the Supabase DB, not a bare Postgres).
 */
import assert from 'node:assert/strict';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set (put it in .env.local).');
}

const sql = postgres(url, {prepare: false, max: 1});

// Sentinel thrown to force `sql.begin` to ROLLBACK once assertions pass.
class Rollback extends Error {}

// Wrapped in main() rather than top-level await: tsx compiles this file as CJS
// (no "type":"module" in package.json), where top-level await is unsupported.
async function main() {
  await sql.begin(async (tx) => {
    // --- Seed as the owner role (bypasses RLS) ---
    const [brand] = await tx`
      insert into restaurants (slug, name)
      values ('smoke-test-brand', 'Smoke Test Brand')
      returning id`;

    const [pub] = await tx`
      insert into restaurant_locations (restaurant_id, slug, city, address, geog, status)
      values (${brand.id}, 'smoke-pub', 'ns', 'Test addr 1',
              ST_SetSRID(ST_MakePoint(19.833, 45.251), 4326)::geography, 'published')
      returning id`;

    const [draft] = await tx`
      insert into restaurant_locations (restaurant_id, slug, city, address, geog, status)
      values (${brand.id}, 'smoke-draft', 'ns', 'Test addr 2',
              ST_SetSRID(ST_MakePoint(19.834, 45.252), 4326)::geography, 'draft')
      returning id`;

    const [pubItem] = await tx`
      insert into menu_items (location_id, name) values (${pub.id}, 'Visible dish') returning id`;
    const [draftItem] = await tx`
      insert into menu_items (location_id, name) values (${draft.id}, 'Hidden dish') returning id`;

    await tx`insert into menu_item_prices (menu_item_id, amount_rsd) values (${pubItem.id}, 500)`;
    await tx`insert into menu_item_prices (menu_item_id, amount_rsd) values (${draftItem.id}, 600)`;

    // --- Become the public anon role and check what a visitor can see ---
    await tx`set local role anon`;

    const locSlugs = (
      await tx`select slug from restaurant_locations where restaurant_id = ${brand.id} order by slug`
    ).map((r) => r.slug);
    assert.deepEqual(
      locSlugs,
      ['smoke-pub'],
      'anon must see the published location and NOT the draft',
    );

    const itemNames = (
      await tx`select name from menu_items where location_id in ${tx([pub.id, draft.id])}`
    ).map((r) => r.name);
    assert.deepEqual(
      itemNames,
      ['Visible dish'],
      "anon must see only the published location's menu item",
    );

    const [{n: priceCount}] = await tx`
      select count(*)::int as n from menu_item_prices
      where menu_item_id in ${tx([pubItem.id, draftItem.id])}`;
    assert.equal(priceCount, 1, "anon must see only the published item's price");

    const [{n: brandCount}] = await tx`
      select count(*)::int as n from restaurants where id = ${brand.id}`;
    assert.equal(
      brandCount,
      1,
      'anon must see the brand (it has a published location)',
    );

    throw new Rollback();
  });
}

main().catch(async (err) => {
  await sql.end();
  if (err instanceof Rollback) {
    console.log('✅ RLS smoke test passed: anon sees published content only.');
    process.exit(0);
  }
  console.error('❌ RLS smoke test FAILED');
  console.error(err);
  process.exit(1);
});
