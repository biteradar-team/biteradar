import 'server-only';
import {createClient} from '@supabase/supabase-js';

/**
 * Privileged Supabase client for server-side Storage writes (photo upload).
 *
 * Uses the SERVICE_ROLE key, which bypasses RLS and Storage policies entirely —
 * so it must NEVER reach the browser (`import 'server-only'`) and is only ever
 * called behind `requireAdmin()`. This is the ONE place that key is used; keep
 * it confined here + in `src/services/photos.ts` (the Storage adapter, blueprint
 * §171). No cookies / session — it's not an auth client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).',
    );
  }
  return createClient(url, key, {auth: {persistSession: false}});
}
