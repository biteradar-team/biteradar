-- One-time Supabase Storage setup for location photos (blueprint §14/§204).
-- Run once in the Supabase SQL editor (Dashboard -> SQL). Idempotent.
--
-- Creates a PUBLIC `photos` bucket: objects are world-readable by URL, which is
-- the intended model (§204 "nasumični object key") — the app always writes keys
-- as `locations/<uuid>/<random-uuid>.webp`, so keys are unguessable. WRITES are
-- restricted to the service_role client (see src/lib/supabase/admin.ts); no
-- anon/authenticated write policy is added, so uploads only work server-side
-- behind requireAdmin().

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = excluded.public;
