-- PostGIS provides the geography type + GIST opclass used below.
CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TYPE "public"."city" AS ENUM('ns', 'bg');--> statement-breakpoint
CREATE TYPE "public"."location_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "cuisines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_sr" text NOT NULL,
	"name_en" text NOT NULL,
	CONSTRAINT "cuisines_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "cuisines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_sr" text NOT NULL,
	"name_en" text,
	"description_sr" text,
	"description_en" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dishes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "dishes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "menu_item_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_item_id" uuid NOT NULL,
	"amount_rsd" integer NOT NULL,
	"currency" char(3) DEFAULT 'RSD' NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "menu_item_prices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"dish_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"section_name" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "opening_hour_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"date" date NOT NULL,
	"closed" boolean DEFAULT true NOT NULL,
	"opens_at" time,
	"closes_at" time,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "opening_hour_exceptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "opening_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens_at" time NOT NULL,
	"closes_at" time NOT NULL
);
--> statement-breakpoint
ALTER TABLE "opening_hours" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid,
	"menu_item_id" uuid,
	"object_key" text NOT NULL,
	"alt_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_has_subject" CHECK ("photos"."location_id" is not null or "photos"."menu_item_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "restaurant_cuisines" (
	"restaurant_id" uuid NOT NULL,
	"cuisine_id" uuid NOT NULL,
	CONSTRAINT "restaurant_cuisines_restaurant_id_cuisine_id_pk" PRIMARY KEY("restaurant_id","cuisine_id")
);
--> statement-breakpoint
ALTER TABLE "restaurant_cuisines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "restaurant_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text,
	"city" "city" NOT NULL,
	"address" text NOT NULL,
	"geog" geography(Point,4326) NOT NULL,
	"accepts_cards" boolean,
	"status" "location_status" DEFAULT 'draft' NOT NULL,
	"source" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "restaurant_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "restaurants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "menu_item_prices" ADD CONSTRAINT "menu_item_prices_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_location_id_restaurant_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."restaurant_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_hour_exceptions" ADD CONSTRAINT "opening_hour_exceptions_location_id_restaurant_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."restaurant_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opening_hours" ADD CONSTRAINT "opening_hours_location_id_restaurant_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."restaurant_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_location_id_restaurant_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."restaurant_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_cuisines" ADD CONSTRAINT "restaurant_cuisines_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_cuisines" ADD CONSTRAINT "restaurant_cuisines_cuisine_id_cuisines_id_fk" FOREIGN KEY ("cuisine_id") REFERENCES "public"."cuisines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_locations" ADD CONSTRAINT "restaurant_locations_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_item_prices_item_valid_from" ON "menu_item_prices" USING btree ("menu_item_id","valid_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "menu_items_location" ON "menu_items" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "menu_items_dish" ON "menu_items" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "opening_hour_exceptions_location_date" ON "opening_hour_exceptions" USING btree ("location_id","date");--> statement-breakpoint
CREATE INDEX "opening_hours_location" ON "opening_hours" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "photos_location" ON "photos" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "photos_menu_item" ON "photos" USING btree ("menu_item_id");--> statement-breakpoint
CREATE INDEX "restaurant_locations_geog_gist" ON "restaurant_locations" USING gist ("geog");--> statement-breakpoint
CREATE INDEX "restaurant_locations_city_status" ON "restaurant_locations" USING btree ("city","status");--> statement-breakpoint
CREATE POLICY "cuisines_anon_select" ON "cuisines" AS PERMISSIVE FOR SELECT TO "anon" USING (true);--> statement-breakpoint
CREATE POLICY "dishes_anon_select" ON "dishes" AS PERMISSIVE FOR SELECT TO "anon" USING (true);--> statement-breakpoint
CREATE POLICY "menu_item_prices_anon_select" ON "menu_item_prices" AS PERMISSIVE FOR SELECT TO "anon" USING (exists (
        select 1 from menu_items mi
        join restaurant_locations l on l.id = mi.location_id
        where mi.id = menu_item_prices.menu_item_id and l.status = 'published'
      ));--> statement-breakpoint
CREATE POLICY "menu_items_anon_select" ON "menu_items" AS PERMISSIVE FOR SELECT TO "anon" USING (exists (select 1 from restaurant_locations l where l.id = menu_items.location_id and l.status = 'published'));--> statement-breakpoint
CREATE POLICY "opening_hour_exceptions_anon_select" ON "opening_hour_exceptions" AS PERMISSIVE FOR SELECT TO "anon" USING (exists (select 1 from restaurant_locations l where l.id = opening_hour_exceptions.location_id and l.status = 'published'));--> statement-breakpoint
CREATE POLICY "opening_hours_anon_select" ON "opening_hours" AS PERMISSIVE FOR SELECT TO "anon" USING (exists (select 1 from restaurant_locations l where l.id = opening_hours.location_id and l.status = 'published'));--> statement-breakpoint
CREATE POLICY "photos_anon_select" ON "photos" AS PERMISSIVE FOR SELECT TO "anon" USING (
        exists (select 1 from restaurant_locations l where l.id = photos.location_id and l.status = 'published')
        or exists (
          select 1 from menu_items mi
          join restaurant_locations l on l.id = mi.location_id
          where mi.id = photos.menu_item_id and l.status = 'published'
        )
      );--> statement-breakpoint
CREATE POLICY "restaurant_cuisines_anon_select" ON "restaurant_cuisines" AS PERMISSIVE FOR SELECT TO "anon" USING (true);--> statement-breakpoint
CREATE POLICY "restaurant_locations_anon_select" ON "restaurant_locations" AS PERMISSIVE FOR SELECT TO "anon" USING (status = 'published');--> statement-breakpoint
CREATE POLICY "restaurants_anon_select" ON "restaurants" AS PERMISSIVE FOR SELECT TO "anon" USING (exists (select 1 from restaurant_locations l where l.restaurant_id = restaurants.id and l.status = 'published'));--> statement-breakpoint
-- Table-level privilege for the public anon role. RLS above still gates which
-- ROWS are visible; this grant is what lets anon touch the tables at all.
-- Writes stay denied: no permissive write policy exists, so RLS blocks them
-- regardless of any grant. Server-side writes use service_role (bypasses RLS).
GRANT USAGE ON SCHEMA public TO anon;--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;