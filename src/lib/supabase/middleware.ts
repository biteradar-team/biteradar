import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';

/**
 * Refreshes the Supabase auth session on every /admin request (rotates expiring
 * tokens and writes the cookies back onto the response). Server Components can't
 * write cookies, so this proxy step is what keeps a logged-in admin logged in.
 *
 * It only refreshes — the actual gate (allowlist check) lives server-side in
 * `requireAdmin()` / the login action. `getClaims()` is the server-safe way to
 * touch the session (never `getSession()` in proxy/server code).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({request});

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({name, value}) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({request});
          cookiesToSet.forEach(({name, value, options}) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getClaims();

  return response;
}
