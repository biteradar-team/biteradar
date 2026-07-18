import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Cookie-backed via next/headers (async in Next 16). `setAll` throws when called
 * from a Server Component (cookies are read-only there) — we swallow it, because
 * the proxy's `updateSession` is what actually persists refreshed auth cookies.
 *
 * Uses the publishable/anon key only (NEXT_PUBLIC_*). The service_role key never
 * touches auth — that's for the future write path (admin ingestion slice).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({name, value, options}) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore (proxy refreshes).
          }
        },
      },
    },
  );
}
