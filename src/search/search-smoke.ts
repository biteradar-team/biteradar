/**
 * Search FTS smoke test — proves the §8 pipeline holds end-to-end against the
 * real Supabase Postgres (SQLite is not a substitute — blueprint §11):
 *
 *   1. FTS match across scripts — a query typed in Cyrillic finds a row whose
 *      normalized_text was built from the Latin form.
 *   2. Typo tolerance — pg_trgm similarity matches a misspelling.
 *   3. RLS still holds — anon does NOT get a matching row on a draft location.
 *
 * `normalized_text` is populated here with the SAME `normalize()` the app uses,
 * so this exercises the actual write→search path. Everything runs in a
 * transaction that is always rolled back (public repo — no fake data persists).
 *
 * Run: npm run db:search-smoke  (needs DATABASE_URL in .env.local).
 */
import assert from 'node:assert/strict';
import postgres from 'postgres';
import {normalize} from './normalize';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set (put it in .env.local).');
}

const sql = postgres(url, {prepare: false, max: 1});

// Sentinel thrown to force `sql.begin` to ROLLBACK once assertions pass.
class Rollback extends Error {}

async function main() {
  await sql.begin(async (tx) => {
    // --- Seed as the owner role (bypasses RLS) ---
    const [brand] = await tx`
      insert into restaurants (slug, name, normalized_text)
      values ('search-smoke-brand', 'Ćevap Kuća', ${normalize('Ćevap Kuća')})
      returning id`;

    const [pub] = await tx`
      insert into restaurant_locations (restaurant_id, slug, city, address, geog, status)
      values (${brand.id}, 'search-smoke-pub', 'ns', 'Test addr 1',
              ST_SetSRID(ST_MakePoint(19.833, 45.251), 4326)::geography, 'published')
      returning id`;
    const [draft] = await tx`
      insert into restaurant_locations (restaurant_id, slug, city, address, geog, status)
      values (${brand.id}, 'search-smoke-draft', 'ns', 'Test addr 2',
              ST_SetSRID(ST_MakePoint(19.834, 45.252), 4326)::geography, 'draft')
      returning id`;

    // Same dish name + normalized_text on both locations — only publish state differs.
    const [pubItem] = await tx`
      insert into menu_items (location_id, name, normalized_text)
      values (${pub.id}, 'Ćevapi', ${normalize('Ćevapi')}) returning id`;
    const [draftItem] = await tx`
      insert into menu_items (location_id, name, normalized_text)
      values (${draft.id}, 'Ćevapi', ${normalize('Ćevapi')}) returning id`;

    // A world-readable dish, stored from the Latin form.
    const [dish] = await tx`
      insert into dishes (slug, name_sr, normalized_text)
      values ('search-smoke-karadjordjeva', 'Karađorđeva', ${normalize('Karađorđeva')})
      returning id`;

    // Link both items to a canonical dish + price them, for the offers test.
    const [offersDish] = await tx`
      insert into dishes (slug, name_sr, normalized_text)
      values ('search-smoke-offer', 'Ćevapi porcija', ${normalize('Ćevapi porcija')})
      returning id`;
    await tx`update menu_items set dish_id = ${offersDish.id}
             where id in ${tx([pubItem.id, draftItem.id])}`;
    await tx`insert into menu_item_prices (menu_item_id, amount_rsd) values (${pubItem.id}, 550)`;
    await tx`insert into menu_item_prices (menu_item_id, amount_rsd) values (${draftItem.id}, 500)`;

    // Tag the dish with a cuisine + derive restaurant_cuisines (the same shape
    // insertChildren uses on write) — for the kategorija filter test.
    const [cuisine] = await tx`
      insert into cuisines (slug, name_sr, name_en)
      values ('search-smoke-cuisine', 'Roštilj test', 'Grill test') returning id`;
    await tx`update dishes set cuisine_id = ${cuisine.id} where id = ${offersDish.id}`;
    await tx`
      insert into restaurant_cuisines (restaurant_id, cuisine_id)
      select distinct l.restaurant_id, d.cuisine_id
      from menu_items mi
      join restaurant_locations l on l.id = mi.location_id
      join dishes d on d.id = mi.dish_id
      where d.cuisine_id is not null and l.restaurant_id = ${brand.id}
      on conflict do nothing`;

    // --- Become the public anon role ---
    await tx`set local role anon`;

    // 1 + 3. Cross-script FTS match, gated by RLS: a Cyrillic query hits the
    // Latin-stored item, but ONLY the published one (draft is hidden even
    // though its text matches identically).
    const q = normalize('ЋЕВАПИ'); // => 'cevapi'
    assert.equal(q, 'cevapi', 'sanity: Cyrillic query normalizes to cevapi');
    const ftsHits = await tx`
      select id from menu_items
      where search_vector @@ plainto_tsquery('simple', ${q})
        and location_id in ${tx([pub.id, draft.id])}`;
    assert.deepEqual(
      ftsHits.map((r) => r.id),
      [pubItem.id],
      'anon FTS must match the published item only (draft hidden by RLS)',
    );

    // 2. Typo tolerance via pg_trgm: 'cevap' (missing the trailing i) matches.
    const [{sim}] = await tx`
      select similarity(normalized_text, ${'cevap'}) as sim
      from menu_items where id = ${pubItem.id}`;
    assert.ok(sim > 0.3, `pg_trgm similarity too low for a typo: ${sim}`);

    // Cross-script FTS on a world-readable table (no RLS gate): Cyrillic query
    // finds the Latin-stored dish.
    const dishHits = await tx`
      select id from dishes
      where search_vector @@ plainto_tsquery('simple', ${normalize('Карађорђева')})
        and id = ${dish.id}`;
    assert.equal(dishHits.length, 1, 'cross-script dish FTS must match');

    // 4. to_tsquery OR form: listPublishedLocations() OR-s synonym terms into a
    // single to_tsquery (built only from normalized alnum tokens). Prove it
    // matches, still gated by RLS (draft hidden).
    const orHits = await tx`
      select id from menu_items
      where search_vector @@ to_tsquery('simple', ${'nepostojece | cevapi'})
        and location_id in ${tx([pub.id, draft.id])}`;
    assert.deepEqual(
      orHits.map((r) => r.id),
      [pubItem.id],
      'anon to_tsquery OR form must match the published item only',
    );

    // 5. "otvoreno sada" predicate — mirror of the open-now expression in
    // listPublishedLocations(), evaluated against fixed reference timestamps so
    // it's deterministic (blueprint §16 past-midnight handling). `offset_days`
    // places the opening_hours row on the ref's day (0) or the previous day (-1),
    // so the cases hold whatever weekday the literal dates fall on.
    const openCases = await tx`
      with cases (label, ref, offset_days, opens_at, closes_at, expected) as (values
        ('same-day open',  timestamp '2026-07-15 14:30',  0, time '08:00', time '23:00', true),
        ('before opening', timestamp '2026-07-15 07:00',  0, time '08:00', time '23:00', false),
        ('past-midnight',  timestamp '2026-07-16 00:30', -1, time '22:00', time '02:00', true),
        ('pre-midnight',   timestamp '2026-07-15 23:30',  0, time '22:00', time '02:00', true),
        ('after close',    timestamp '2026-07-16 03:00', -1, time '22:00', time '02:00', false)
      ),
      rows as (
        select label, ref, opens_at, closes_at, expected,
          ((extract(dow from ref)::int + offset_days) % 7 + 7) % 7 as dow
        from cases
      )
      select label, expected, (
        (closes_at > opens_at
          and dow = extract(dow from ref)::int
          and ref::time >= opens_at and ref::time < closes_at)
        or (closes_at <= opens_at and (
          (dow = extract(dow from ref)::int and ref::time >= opens_at)
          or (dow = (extract(dow from ref)::int + 6) % 7 and ref::time < closes_at)
        ))
      ) as got
      from rows`;
    for (const c of openCases) {
      assert.equal(c.got, c.expected, `open-now case "${c.label}" expected ${c.expected}`);
    }

    // 6. Dish offers — mirrors listDishOffers(): dish_id join + explicit
    // status='published'. The draft's identically-linked item (even at a lower
    // price) must NOT surface; the published one does, with its price.
    const offerRows = await tx`
      select l.slug,
        (select amount_rsd from menu_item_prices p where p.menu_item_id = mi.id
         order by valid_from desc limit 1) as price
      from menu_items mi
      join restaurant_locations l on l.id = mi.location_id
      where mi.dish_id = ${offersDish.id} and l.status = 'published'
      order by price asc nulls last`;
    assert.deepEqual(
      offerRows.map((r) => r.slug),
      ['search-smoke-pub'],
      'dish offers must include the published location only (draft hidden)',
    );
    assert.equal(
      Number(offerRows[0].price),
      550,
      'offer price must be the published item price, not the cheaper draft',
    );

    // 7. Cuisine (kategorija) filter — mirrors listPublishedLocations({cuisine}):
    // published locations whose restaurant has the cuisine. Draft stays hidden;
    // an unrelated cuisine matches nothing.
    const cuisineHits = await tx`
      select l.slug from restaurant_locations l
      where l.status = 'published'
        and exists (select 1 from restaurant_cuisines rc
                    where rc.restaurant_id = l.restaurant_id and rc.cuisine_id = ${cuisine.id})
        and l.id in ${tx([pub.id, draft.id])}`;
    assert.deepEqual(
      cuisineHits.map((r) => r.slug),
      ['search-smoke-pub'],
      'cuisine filter returns the published location only',
    );
    const noHits = await tx`
      select 1 from restaurant_locations l
      where l.status = 'published'
        and exists (select 1 from restaurant_cuisines rc
                    where rc.restaurant_id = l.restaurant_id and rc.cuisine_id = gen_random_uuid())`;
    assert.equal(noHits.length, 0, 'a cuisine with no links matches nothing');

    throw new Rollback();
  });
}

main().catch(async (err) => {
  await sql.end();
  if (err instanceof Rollback) {
    console.log('✅ Search smoke passed: cross-script FTS + typo tolerance + RLS hold.');
    process.exit(0);
  }
  console.error('❌ Search smoke FAILED');
  console.error(err);
  process.exit(1);
});
