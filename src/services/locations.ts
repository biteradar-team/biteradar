import 'server-only';
import {and, eq, sql, type SQL} from 'drizzle-orm';
import {db} from '@/src/db';
import {
  cuisines,
  dishes,
  menuItemPrices,
  menuItems,
  openingHourExceptions,
  openingHours,
  restaurantCuisines,
  restaurantLocations,
  restaurants,
} from '@/src/db/schema';
import {type City} from '@/src/lib/cities';
import {PRICE_BAND_MAX, type PriceBand} from '@/src/lib/prices';
import {matchDish, type DishCandidate} from '@/src/search/dish-match';
import {expandSynonyms, normalize} from '@/src/search/normalize';
import {type LocationPhoto, listLocationPhotos, photoPublicUrl} from './photos';
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

/**
 * Holiday-aware "open right now" as a boolean SQL expression, shared by the home
 * list and the profile so the two can never disagree. `locId` is the SQL for the
 * enclosing row's location id (`l.id` in the list, `restaurant_locations.id` in
 * the profile); `nowTs` is a Belgrade-local timestamp expression.
 *
 * A same-day `opening_hour_exceptions` row OVERRIDES the weekly `opening_hours`
 * (§15/§16 — open-now is wrong on holidays without this). Past-midnight spans
 * (`closes_at <= opens_at`) count on their own day after opening, and bleed into
 * the next weekday until close.
 */
function openNowSql(locId: SQL, nowTs: SQL): SQL<boolean> {
  return sql<boolean>`case
    when exists (
      select 1 from opening_hour_exceptions e
      where e.location_id = ${locId} and e.date = (${nowTs})::date
    ) then exists (
      select 1 from opening_hour_exceptions e
      where e.location_id = ${locId} and e.date = (${nowTs})::date
        and e.closed = false
        and e.opens_at is not null and e.closes_at is not null
        and (
          (e.closes_at > e.opens_at
            and (${nowTs})::time >= e.opens_at and (${nowTs})::time < e.closes_at)
          or (e.closes_at <= e.opens_at and (${nowTs})::time >= e.opens_at)
        )
    )
    else exists (
      select 1 from opening_hours oh
      where oh.location_id = ${locId} and (
        (oh.closes_at > oh.opens_at
          and oh.day_of_week = extract(dow from (${nowTs}))::int
          and (${nowTs})::time >= oh.opens_at and (${nowTs})::time < oh.closes_at)
        or (oh.closes_at <= oh.opens_at and (
          (oh.day_of_week = extract(dow from (${nowTs}))::int and (${nowTs})::time >= oh.opens_at)
          or (oh.day_of_week = (extract(dow from (${nowTs}))::int + 6) % 7 and (${nowTs})::time < oh.closes_at)
        ))
      )
    )
  end`;
}

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
        // ponytail: "verified" == "a curator last touched this row". Good enough
        // for the trust badge at launch. Upgrade path: a distinct "mark verified"
        // admin action if editing a typo should stop counting as re-verification.
        verifiedAt: new Date(),
      })
      .returning({id: restaurantLocations.id, slug: restaurantLocations.slug});

    await insertChildren(tx, location.id, brand.id, data);
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
        verifiedAt: new Date(), // see createLocation for the ponytail note
      })
      .where(eq(restaurantLocations.id, locationId));

    // ponytail: hours + menu are replaced wholesale (delete children, re-insert)
    // rather than diffed. This discards menu price history on every edit —
    // acceptable pre-launch (no meaningful history yet). Upgrade path: diff menu
    // rows and only append a new price when the amount actually changed.
    await tx.delete(openingHours).where(eq(openingHours.locationId, locationId));
    await tx
      .delete(openingHourExceptions)
      .where(eq(openingHourExceptions.locationId, locationId));
    await tx.delete(menuItems).where(eq(menuItems.locationId, locationId));
    await insertChildren(tx, locationId, loc.restaurantId, data);
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

  const exceptions = await db
    .select({
      date: openingHourExceptions.date,
      closed: openingHourExceptions.closed,
      opensAt: openingHourExceptions.opensAt,
      closesAt: openingHourExceptions.closesAt,
      note: openingHourExceptions.note,
    })
    .from(openingHourExceptions)
    .where(eq(openingHourExceptions.locationId, locationId))
    .orderBy(openingHourExceptions.date);

  const menu = await db
    .select({
      name: menuItems.name,
      sectionName: menuItems.sectionName,
      description: menuItems.description,
      // current price = latest valid_from (schema §7).
      // Correlate on menu_items.id spelled out — `${menuItems.id}` renders as a
      // BARE "id" inside a raw sql`` subquery, which binds to menu_item_prices'
      // own `id` column (p.menu_item_id = p.id, never true) and yields null.
      priceRsd: sql<number>`(
        select amount_rsd from menu_item_prices p
        where p.menu_item_id = menu_items.id
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
    exceptions: exceptions.map((e) => ({
      date: e.date,
      closed: e.closed,
      opensAt: e.opensAt ? e.opensAt.slice(0, 5) : '',
      closesAt: e.closesAt ? e.closesAt.slice(0, 5) : '',
      note: e.note ?? '',
    })),
    menu: menu.map((m) => ({
      name: m.name,
      sectionName: m.sectionName ?? '',
      description: m.description ?? '',
      priceRsd: String(m.priceRsd ?? ''),
    })),
  };
}

/** Display-ready shape for the public location profile page. */
export type PublicLocation = {
  slug: string;
  brand: {name: string; description: string};
  location: {
    label: string;
    city: 'ns' | 'bg';
    address: string;
    acceptsCards: 'yes' | 'no' | 'unknown';
    lat: number;
    lng: number;
  };
  /** When a curator last confirmed this row; null → badge is hidden (no lie). */
  verifiedAt: Date | null;
  /** Holiday-aware "open right now" (Europe/Belgrade), computed at request time. */
  openNow: boolean;
  cuisines: string[]; // display names (nameSr), for JSON-LD servesCuisine
  hours: {day: number; opensAt: string; closesAt: string}[]; // open days only
  menu: {
    sectionName: string;
    name: string;
    description: string;
    priceRsd: number;
    dishSlug: string | null; // linked canonical dish → /jelo/[slug], or null
  }[];
  photos: LocationPhoto[];
};

/**
 * Loads one PUBLISHED location for the public profile page, or null.
 *
 * TRUST BOUNDARY: `db` bypasses RLS, so the `status = 'published'` predicate
 * below is what keeps drafts off the public site — never drop it. RLS is only
 * the backstop for direct anon-API access, not for this owner-role query.
 */
export async function getPublishedLocationBySlug(
  slug: string,
): Promise<PublicLocation | null> {
  const [row] = await db
    .select({
      id: restaurantLocations.id,
      restaurantId: restaurantLocations.restaurantId,
      brandName: restaurants.name,
      description: restaurants.description,
      label: restaurantLocations.name,
      city: restaurantLocations.city,
      address: restaurantLocations.address,
      acceptsCards: restaurantLocations.acceptsCards,
      verifiedAt: restaurantLocations.verifiedAt,
      lat: sql<number>`st_y(${restaurantLocations.geog}::geometry)`,
      lng: sql<number>`st_x(${restaurantLocations.geog}::geometry)`,
      // Holiday-aware open-now, same expression the home list uses (respects
      // opening_hour_exceptions). Computed at request time — the page is dynamic.
      openNow: openNowSql(
        sql`restaurant_locations.id`,
        sql`(now() at time zone 'Europe/Belgrade')`,
      ),
    })
    .from(restaurantLocations)
    .innerJoin(restaurants, eq(restaurants.id, restaurantLocations.restaurantId))
    .where(
      and(
        eq(restaurantLocations.slug, slug),
        eq(restaurantLocations.status, 'published'),
      ),
    )
    .limit(1);
  if (!row) return null;

  // These four all depend only on `row`, not on each other — run them in one
  // round-trip instead of four. The DB is in eu-central-1, so each sequential
  // await was a full cross-region hop; parallelizing is most of the profile's
  // TTFB. (Region co-location in vercel.json cuts the per-hop cost too.)
  const [cuisineRows, hours, menu, photos] = await Promise.all([
    db
      .select({name: cuisines.nameSr})
      .from(restaurantCuisines)
      .innerJoin(cuisines, eq(cuisines.id, restaurantCuisines.cuisineId))
      .where(eq(restaurantCuisines.restaurantId, row.restaurantId))
      .orderBy(cuisines.nameSr),
    db
      .select({
        day: openingHours.dayOfWeek,
        opensAt: openingHours.opensAt,
        closesAt: openingHours.closesAt,
      })
      .from(openingHours)
      .where(eq(openingHours.locationId, row.id))
      .orderBy(openingHours.dayOfWeek),
    db
      .select({
        name: menuItems.name,
        sectionName: menuItems.sectionName,
        description: menuItems.description,
        dishSlug: dishes.slug,
        // See getLocationForEdit: correlate on the spelled-out menu_items.id, not
        // `${menuItems.id}` (which renders bare and binds to p.id → null).
        priceRsd: sql<number>`(
          select amount_rsd from menu_item_prices p
          where p.menu_item_id = menu_items.id
          order by valid_from desc limit 1
        )`,
      })
      .from(menuItems)
      .leftJoin(dishes, eq(dishes.id, menuItems.dishId))
      .where(eq(menuItems.locationId, row.id))
      .orderBy(menuItems.sortOrder),
    listLocationPhotos(row.id),
  ]);

  return {
    slug,
    brand: {name: row.brandName, description: row.description ?? ''},
    location: {
      label: row.label ?? '',
      city: row.city,
      address: row.address,
      acceptsCards:
        row.acceptsCards === null ? 'unknown' : row.acceptsCards ? 'yes' : 'no',
      lat: row.lat,
      lng: row.lng,
    },
    verifiedAt: row.verifiedAt,
    openNow: row.openNow,
    cuisines: cuisineRows.map((c) => c.name),
    hours: hours.map((h) => ({
      day: h.day,
      opensAt: h.opensAt.slice(0, 5),
      closesAt: h.closesAt.slice(0, 5),
    })),
    menu: menu.map((m) => ({
      sectionName: m.sectionName ?? '',
      name: m.name,
      description: m.description ?? '',
      dishSlug: m.dishSlug ?? null,
      priceRsd: Number(m.priceRsd ?? 0),
    })),
    photos,
  };
}

/**
 * Slugs of every published location, for the sitemap. Same trust boundary as
 * the rest of this service: `db` bypasses RLS, so `status = 'published'` is the
 * gate. `updatedAt` feeds the sitemap's `lastModified`.
 */
export async function getPublishedLocationSlugs(): Promise<
  {slug: string; updatedAt: Date}[]
> {
  return db
    .select({slug: restaurantLocations.slug, updatedAt: restaurantLocations.updatedAt})
    .from(restaurantLocations)
    .where(eq(restaurantLocations.status, 'published'));
}

/** One card on the public home list. */
export type PublicLocationSummary = {
  slug: string;
  brandName: string;
  label: string | null;
  city: City;
  address: string;
  acceptsCards: 'yes' | 'no' | 'unknown';
  photoUrl: string | null;
  openNow: boolean;
  /** ₽ / ₽₽ / ₽₽₽, or null when the location has no priced menu item yet. */
  priceBand: PriceBand | null;
  /** Map pin coordinates (geog is NOT NULL, so always present). */
  lat: number;
  lng: number;
};

export type ListParams = {
  q?: string;
  city?: City;
  openNow?: boolean;
  /** Cuisine SLUG (e.g. `srpska`), not the UUID. */
  cuisine?: string;
  /** Only locations that definitely take cards (unknown does not count). */
  cards?: boolean;
  /** Open at or past 23:00 on at least one day of the week. */
  late?: boolean;
  price?: PriceBand;
  /** „Blizu mene": the user's position. Sorts by distance instead of open/name. */
  near?: {lat: number; lng: number};
};

/**
 * Home-page location list, filtered by free-text `q`, `city`, and `openNow`.
 *
 * TRUST BOUNDARY: `db` bypasses RLS, so `status = 'published'` is hard-wired
 * into the WHERE and must never be dropped.
 *
 * `q` (blueprint §8): normalize the query the same way stored text was, then
 * match a location if its brand OR any of its menu items hits — via FTS
 * (`search_vector @@ to_tsquery`) with a pg_trgm `similarity() > 0.3` fallback
 * for typos. Synonyms (`expandSynonyms`) are OR-ed into the tsquery. The query
 * string fed to `to_tsquery` is built only from normalized tokens (letters/
 * digits/spaces), so the `&`/`|` operators we add are the only operators.
 *
 * `openNow`: computed against `now()` in Europe/Belgrade, handling past-midnight
 * spans (a row whose `closes_at <= opens_at` belongs to the previous weekday
 * after midnight). Open locations sort first regardless of the filter.
 *
 * `late` is the „otvoreno posle 23h" preset (§3.1) and asks a different question
 * than `openNow` — about the schedule, not the current time. `cards`, `price` and
 * `cuisine` round out the §3.1 filter set; `price` buckets the location's average
 * current menu price via `PRICE_BAND_MAX`.
 */
export async function listPublishedLocations(
  params: ListParams = {},
): Promise<PublicLocationSummary[]> {
  const {city, openNow, cuisine, cards, late, price, near} = params;
  const qnorm = params.q ? normalize(params.q) : '';

  // "open right now" (holiday-aware) as a reusable boolean — used in SELECT, and
  // in WHERE when the filter is on. Shared with the profile via openNowSql so the
  // two never disagree. `n.ts` is the Belgrade-local now() from the CTE below.
  const openNowExpr = openNowSql(sql`l.id`, sql`n.ts`);

  // Price band from the location's AVERAGE current menu price (`pr` below).
  // Bucketed in SQL rather than in JS because the WHERE needs it too — an alias
  // isn't visible there, so the expression is reused the same way `openNowExpr` is.
  const priceBandExpr = sql`case
    when pr.avg_price is null then null
    when pr.avg_price <= ${PRICE_BAND_MAX[0]} then 1
    when pr.avg_price <= ${PRICE_BAND_MAX[1]} then 2
    else 3
  end`;

  const conditions = [sql`l.status = 'published'`];
  if (city) conditions.push(sql`l.city = ${city}`);
  if (openNow) conditions.push(openNowExpr);
  // `is true` on purpose: a NULL means "we haven't checked", which must not pass
  // a filter that promises card payment.
  if (cards) conditions.push(sql`l.accepts_cards is true`);
  if (late) {
    // A SCHEDULE question, not a clock question — so it deliberately does NOT
    // reuse `openNowExpr`, which is pinned to `n.ts`. A span that wraps past
    // midnight (`closes_at <= opens_at`, which also covers 24h) is open past 23h
    // by definition; otherwise the closing time itself has to be later than 23:00.
    conditions.push(sql`exists (
      select 1 from opening_hours oh
      where oh.location_id = l.id
        and (oh.closes_at <= oh.opens_at or oh.closes_at > time '23:00')
    )`);
  }
  // NULL band (no priced menu item) fails the comparison, so unpriced locations
  // drop out when the filter is on and stay in when it's off. That's intended:
  // unknown is not a match.
  if (price) conditions.push(sql`${priceBandExpr} = ${price}`);
  if (cuisine) {
    conditions.push(sql`exists (
      select 1 from restaurant_cuisines rc
      join cuisines c on c.id = rc.cuisine_id
      where rc.restaurant_id = l.restaurant_id and c.slug = ${cuisine}
    )`);
  }
  if (qnorm) {
    // Each synonym term: words AND-ed; terms OR-ed. Tokens are alphanumeric, so
    // this is a safe to_tsquery input.
    const tsq = expandSynonyms(qnorm)
      .map((term) => term.split(/\s+/).filter(Boolean).join(' & '))
      .filter(Boolean)
      .join(' | ');
    conditions.push(sql`(
      r.search_vector @@ to_tsquery('simple', ${tsq})
      or similarity(r.normalized_text, ${qnorm}) > 0.3
      or exists (
        select 1 from menu_items mi
        where mi.location_id = l.id and (
          mi.search_vector @@ to_tsquery('simple', ${tsq})
          or similarity(mi.normalized_text, ${qnorm}) > 0.3
        )
      )
    )`);
  }

  // „Blizu mene": order by KNN distance (the `<->` operator is index-assisted on
  // restaurant_locations_geog_gist), so no arbitrary radius is needed and the
  // list never comes back empty. Otherwise the default open-first, then A→Z.
  const orderBy = near
    ? sql`l.geog <-> st_setsrid(st_makepoint(${near.lng}, ${near.lat}), 4326)::geography`
    : sql`open_now desc, r.name`;

  const rows = await db.execute(sql`
    with n as (select (now() at time zone 'Europe/Belgrade') as ts)
    select
      l.slug, r.name as brand_name, l.name as label, l.city, l.address,
      l.accepts_cards,
      st_y(l.geog::geometry) as lat, st_x(l.geog::geometry) as lng,
      (select p.object_key from photos p
        where p.location_id = l.id order by p.sort_order limit 1) as photo_key,
      ${openNowExpr} as open_now,
      ${priceBandExpr} as price_band
    from n, restaurant_locations l
    join restaurants r on r.id = l.restaurant_id
    -- Average of each menu item's CURRENT price (latest by valid_from — the same
    -- price-history rule the profile and dish pages use). LEFT so a location with
    -- no priced menu still shows up when the price filter is off.
    left join lateral (
      select avg(cur.amount_rsd)::int as avg_price
      from menu_items mi
      cross join lateral (
        select p.amount_rsd from menu_item_prices p
        where p.menu_item_id = mi.id order by p.valid_from desc limit 1
      ) cur
      where mi.location_id = l.id
    ) pr on true
    where ${sql.join(conditions, sql` and `)}
    order by ${orderBy}
    limit 100
  `);

  return rows.map((r) => ({
    slug: r.slug as string,
    brandName: r.brand_name as string,
    label: (r.label as string | null) ?? null,
    city: r.city as City,
    address: r.address as string,
    acceptsCards:
      r.accepts_cards === null ? 'unknown' : r.accepts_cards ? 'yes' : 'no',
    photoUrl: r.photo_key ? photoPublicUrl(r.photo_key as string) : null,
    openNow: Boolean(r.open_now),
    priceBand: (r.price_band as PriceBand | null) ?? null,
    lat: Number(r.lat),
    lng: Number(r.lng),
  }));
}

// --- shared helpers ---------------------------------------------------------

const brandText = (d: LocationInput) =>
  normalize([d.brand.name, d.brand.description].filter(Boolean).join(' '));

const geog = (d: LocationInput) =>
  sql`ST_SetSRID(ST_MakePoint(${d.location.lng}, ${d.location.lat}), 4326)::geography`;

// Insert the hours + menu that hang off a location. One row per OPEN day (a
// closed weekday is simply absent — schema requires opens/closes NOT NULL).
async function insertChildren(
  tx: Tx,
  locationId: string,
  restaurantId: string,
  data: LocationInput,
) {
  const openRows = data.hours
    .filter((h) => !h.closed)
    .map((h) => ({
      locationId,
      dayOfWeek: h.day,
      opensAt: h.opensAt!,
      closesAt: h.closesAt!,
    }));
  if (openRows.length) await tx.insert(openingHours).values(openRows);

  // Holiday / special-day overrides. Closed days drop any times; the read path
  // (`openNowExpr`) treats a closed exception as authoritative for that date.
  const exceptionRows = data.exceptions.map((e) => ({
    locationId,
    date: e.date,
    closed: e.closed,
    opensAt: e.closed ? null : e.opensAt || null,
    closesAt: e.closed ? null : e.closesAt || null,
    note: e.note || null,
  }));
  if (exceptionRows.length)
    await tx.insert(openingHourExceptions).values(exceptionRows);

  // Canonical-dish auto-link (blueprint §3.1): match each item's NAME to a
  // seeded dish so /jelo price pages work. Load candidates once per txn.
  const dishCandidates: DishCandidate[] = (
    await tx.select({id: dishes.id, normalizedName: dishes.normalizedText}).from(dishes)
  ).map((d) => ({id: d.id, normalizedName: d.normalizedName ?? ''}));

  for (const [i, item] of data.menu.entries()) {
    const [row] = await tx
      .insert(menuItems)
      .values({
        locationId,
        name: item.name,
        description: item.description,
        sectionName: item.sectionName,
        sortOrder: i,
        dishId: matchDish(item.name, dishCandidates),
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

  // Derive this restaurant's cuisines from its (just-linked) menu dishes
  // (blueprint §13 kategorija). Re-derive wholesale — safe while all rows are
  // derived; when admin-assigned cuisines land, gate this on a `source` flag so
  // it doesn't clobber manual picks.
  await tx.delete(restaurantCuisines).where(eq(restaurantCuisines.restaurantId, restaurantId));
  await tx.execute(sql`
    insert into restaurant_cuisines (restaurant_id, cuisine_id)
    select distinct l.restaurant_id, d.cuisine_id
    from menu_items mi
    join restaurant_locations l on l.id = mi.location_id
    join dishes d on d.id = mi.dish_id
    where d.cuisine_id is not null and l.restaurant_id = ${restaurantId}
    on conflict (restaurant_id, cuisine_id) do nothing
  `);
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
