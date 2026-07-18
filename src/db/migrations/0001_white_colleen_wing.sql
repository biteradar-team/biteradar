-- Hand-added (not emitted by drizzle-kit): FTS extensions. pg_trgm provides the
-- gin_trgm_ops opclass used by the trigram indexes below (typo tolerance).
-- ponytail: unaccent is part of the §8 USVOJENO stack and kept for step-7
-- DB-side use, though src/search normalize() already folds diacritics in TS.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
ALTER TABLE "dishes" ADD COLUMN "normalized_text" text;--> statement-breakpoint
ALTER TABLE "dishes" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(normalized_text, ''))) STORED;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "normalized_text" text;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(normalized_text, ''))) STORED;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "normalized_text" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(normalized_text, ''))) STORED;--> statement-breakpoint
CREATE INDEX "dishes_search_vector" ON "dishes" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "dishes_normalized_trgm" ON "dishes" USING gin ("normalized_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "menu_items_search_vector" ON "menu_items" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "menu_items_normalized_trgm" ON "menu_items" USING gin ("normalized_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "restaurants_search_vector" ON "restaurants" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "restaurants_normalized_trgm" ON "restaurants" USING gin ("normalized_text" gin_trgm_ops);