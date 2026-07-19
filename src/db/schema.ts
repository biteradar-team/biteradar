import {sql, type SQL} from 'drizzle-orm';
import {
  type AnyPgColumn,
  boolean,
  char,
  check,
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import {anonRole} from 'drizzle-orm/supabase';

/**
 * BiteRadar core schema — read-only MVP (blueprint §7).
 *
 * Column names are snake_case in the DB (see `casing: 'snake_case'` in
 * drizzle.config.ts and src/db/index.ts); TS keys stay camelCase.
 *
 * RLS (blueprint §5, security-critical):
 *   - Every table has RLS on (defining any policy enables it).
 *   - Reads: anon may SELECT published content only. Generic reference tables
 *     (cuisines, dishes) are world-readable.
 *   - Writes: NO anon/authenticated write policies anywhere → denied by
 *     default. All writes happen server-side with the service_role key, which
 *     bypasses RLS (future admin tool). This is the whole write-security model.
 *
 * Policy `using` clauses are raw SQL with literal table/column names to avoid
 * circular-reference issues between tables defined in this file.
 */

// PostGIS point stored as `geography(Point, 4326)`. We only need the column +
// GIST index here; reads/writes of coordinates go through raw SQL
// (ST_MakePoint / ST_SetSRID) in the service layer. Blueprint §5.
//
// ponytail: drizzle-kit quotes this type in generated SQL as
// "geography(Point,4326)", which Postgres rejects. The generated migration is
// hand-edited to unquote it (and to `CREATE EXTENSION postgis` first). If you
// ever regenerate a migration touching this column, re-apply that unquote.
const geographyPoint = customType<{data: string; driverData: string}>({
  dataType() {
    return 'geography(Point,4326)';
  },
});

// Postgres full-text search vector (blueprint §8). Populated as a generated
// STORED column from `normalized_text` (see `searchVector` below). drizzle-kit
// may quote this type in generated SQL like it does `geography` — if so, unquote
// it in the migration (same hand-edit as `geog`).
const tsvector = customType<{data: string}>({
  dataType() {
    return 'tsvector';
  },
});

// Shared definition of the search columns added to every free-text-searchable
// table (restaurants, dishes, menu_items — blueprint §8). `normalizedText` is
// written by the app via src/search `normalize()` at write time (NULL until the
// admin/ingestion tool populates it). `searchVector` is derived in Postgres and
// stays in sync automatically — no trigger. The 2-arg `to_tsvector('simple',…)`
// form is IMMUTABLE, which a generated column requires; 'simple' because the
// text is already normalized latin and PG ships no Serbian stemmer.
const searchColumns = {
  normalizedText: text(),
  searchVector: tsvector().generatedAlwaysAs(
    (): SQL => sql`to_tsvector('simple', coalesce(normalized_text, ''))`,
  ),
};

// GIN indexes for a searchable table (blueprint §7: "GIN za tsvector/trigram"):
// tsvector for full-text match, trigram on normalized_text for typo tolerance.
const searchIndexes = (
  table: string,
  cols: {searchVector: AnyPgColumn; normalizedText: AnyPgColumn},
) => [
  index(`${table}_search_vector`).using('gin', cols.searchVector),
  index(`${table}_normalized_trgm`).using(
    'gin',
    sql`${cols.normalizedText} gin_trgm_ops`,
  ),
];

export const cityEnum = pgEnum('city', ['ns', 'bg']);
export const locationStatusEnum = pgEnum('location_status', [
  'draft',
  'published',
  'archived',
]);

// Reused SQL: is the location owning this row published?
const locationPublished = (localColumn: string) =>
  sql.raw(
    `exists (select 1 from restaurant_locations l where l.id = ${localColumn} and l.status = 'published')`,
  );

// --- Brand -----------------------------------------------------------------

export const restaurants = pgTable(
  'restaurants',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text(),
    ...searchColumns,
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (t) => [
    ...searchIndexes('restaurants', t),
    // Don't leak brands that have no live (published) location yet.
    pgPolicy('restaurants_anon_select', {
      for: 'select',
      to: anonRole,
      using: sql`exists (select 1 from restaurant_locations l where l.restaurant_id = restaurants.id and l.status = 'published')`,
    }),
  ],
);

// --- Physical location -----------------------------------------------------

export const restaurantLocations = pgTable(
  'restaurant_locations',
  {
    id: uuid().primaryKey().defaultRandom(),
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id, {onDelete: 'cascade'}),
    slug: text().notNull().unique(),
    name: text(), // optional label, e.g. "Liman" for a chain
    city: cityEnum().notNull(),
    address: text().notNull(),
    geog: geographyPoint().notNull(),
    // The §3.1 local differentiator. null = unknown (not "doesn't accept").
    acceptsCards: boolean(),
    status: locationStatusEnum().notNull().default('draft'),
    source: text(),
    verifiedAt: timestamp({withTimezone: true}),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (t) => [
    index('restaurant_locations_geog_gist').using('gist', t.geog),
    index('restaurant_locations_city_status').on(t.city, t.status),
    pgPolicy('restaurant_locations_anon_select', {
      for: 'select',
      to: anonRole,
      using: sql`status = 'published'`,
    }),
  ],
);

// --- Opening hours ---------------------------------------------------------

export const openingHours = pgTable(
  'opening_hours',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid()
      .notNull()
      .references(() => restaurantLocations.id, {onDelete: 'cascade'}),
    dayOfWeek: smallint().notNull(), // 0 = Sunday … 6 = Saturday
    opensAt: time().notNull(),
    // May be < opensAt when a place closes after midnight; interpreted in the
    // later "open now" logic (blueprint §16).
    closesAt: time().notNull(),
  },
  (t) => [
    index('opening_hours_location').on(t.locationId),
    pgPolicy('opening_hours_anon_select', {
      for: 'select',
      to: anonRole,
      using: locationPublished('opening_hours.location_id'),
    }),
  ],
);

// Holiday / special-day overrides. Needed for a correct "otvoreno sada" at
// launch (blueprint §16 warns open-now is wrong without these).
export const openingHourExceptions = pgTable(
  'opening_hour_exceptions',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid()
      .notNull()
      .references(() => restaurantLocations.id, {onDelete: 'cascade'}),
    date: date().notNull(),
    closed: boolean().notNull().default(true),
    opensAt: time(),
    closesAt: time(),
    note: text(),
  },
  (t) => [
    index('opening_hour_exceptions_location_date').on(t.locationId, t.date),
    pgPolicy('opening_hour_exceptions_anon_select', {
      for: 'select',
      to: anonRole,
      using: locationPublished('opening_hour_exceptions.location_id'),
    }),
  ],
);

// --- Cuisines (lookup + M2M) -----------------------------------------------

export const cuisines = pgTable(
  'cuisines',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    nameSr: text().notNull(),
    nameEn: text().notNull(),
  },
  () => [
    pgPolicy('cuisines_anon_select', {
      for: 'select',
      to: anonRole,
      using: sql`true`, // generic reference data
    }),
  ],
);

export const restaurantCuisines = pgTable(
  'restaurant_cuisines',
  {
    restaurantId: uuid()
      .notNull()
      .references(() => restaurants.id, {onDelete: 'cascade'}),
    cuisineId: uuid()
      .notNull()
      .references(() => cuisines.id, {onDelete: 'cascade'}),
  },
  (t) => [
    primaryKey({columns: [t.restaurantId, t.cuisineId]}),
    pgPolicy('restaurant_cuisines_anon_select', {
      for: 'select',
      to: anonRole,
      using: sql`true`, // only maps brand → cuisine; nothing sensitive
    }),
  ],
);

// --- Dishes (canonical) + menu ---------------------------------------------

// Canonical dish ("ćevapi" the concept). Powers cross-location price pages
// like "ćevapi u Novom Sadu po ceni" (blueprint §3.1).
export const dishes = pgTable(
  'dishes',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    nameSr: text().notNull(),
    nameEn: text(),
    // A canonical dish belongs to one cuisine/category (blueprint §13 kategorija
    // landing pages). Nullable + set null on delete; the source we derive a
    // location's restaurant_cuisines from.
    cuisineId: uuid().references(() => cuisines.id, {onDelete: 'set null'}),
    descriptionSr: text(),
    descriptionEn: text(),
    ...searchColumns,
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (t) => [
    ...searchIndexes('dishes', t),
    pgPolicy('dishes_anon_select', {
      for: 'select',
      to: anonRole,
      using: sql`true`, // generic reference data
    }),
  ],
);

// A concrete item on a concrete location's menu. `sectionName` folds
// menus/menu_sections into one column for the MVP (see ADR 0001).
export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid()
      .notNull()
      .references(() => restaurantLocations.id, {onDelete: 'cascade'}),
    dishId: uuid().references(() => dishes.id, {onDelete: 'set null'}),
    name: text().notNull(),
    description: text(),
    sectionName: text(),
    sortOrder: integer().notNull().default(0),
    isAvailable: boolean().notNull().default(true),
    ...searchColumns,
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
    updatedAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (t) => [
    ...searchIndexes('menu_items', t),
    index('menu_items_location').on(t.locationId),
    index('menu_items_dish').on(t.dishId),
    pgPolicy('menu_items_anon_select', {
      for: 'select',
      to: anonRole,
      using: locationPublished('menu_items.location_id'),
    }),
  ],
);

// Price history, tied to the LOCATION via menu_item (chains vary by location,
// blueprint §7). Current price = row with the latest valid_from.
export const menuItemPrices = pgTable(
  'menu_item_prices',
  {
    id: uuid().primaryKey().defaultRandom(),
    menuItemId: uuid()
      .notNull()
      .references(() => menuItems.id, {onDelete: 'cascade'}),
    amountRsd: integer().notNull(), // whole dinars
    currency: char({length: 3}).notNull().default('RSD'),
    validFrom: timestamp({withTimezone: true}).notNull().defaultNow(),
    source: text(),
    verifiedAt: timestamp({withTimezone: true}),
  },
  (t) => [
    index('menu_item_prices_item_valid_from').on(
      t.menuItemId,
      t.validFrom.desc(),
    ),
    pgPolicy('menu_item_prices_anon_select', {
      for: 'select',
      to: anonRole,
      using: sql`exists (
        select 1 from menu_items mi
        join restaurant_locations l on l.id = mi.location_id
        where mi.id = menu_item_prices.menu_item_id and l.status = 'published'
      )`,
    }),
  ],
);

// --- Photos ----------------------------------------------------------------

// Object key into Supabase Storage. Variants come from Storage image
// transforms, not separate rows (see ADR 0001).
export const photos = pgTable(
  'photos',
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid().references(() => restaurantLocations.id, {
      onDelete: 'cascade',
    }),
    menuItemId: uuid().references(() => menuItems.id, {onDelete: 'cascade'}),
    objectKey: text().notNull(),
    altText: text(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({withTimezone: true}).notNull().defaultNow(),
  },
  (t) => [
    check(
      'photos_has_subject',
      sql`${t.locationId} is not null or ${t.menuItemId} is not null`,
    ),
    index('photos_location').on(t.locationId),
    index('photos_menu_item').on(t.menuItemId),
    pgPolicy('photos_anon_select', {
      for: 'select',
      to: anonRole,
      using: sql`
        exists (select 1 from restaurant_locations l where l.id = photos.location_id and l.status = 'published')
        or exists (
          select 1 from menu_items mi
          join restaurant_locations l on l.id = mi.location_id
          where mi.id = photos.menu_item_id and l.status = 'published'
        )
      `,
    }),
  ],
);
