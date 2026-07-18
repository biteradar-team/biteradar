import 'server-only';
import {redirect} from 'next/navigation';
import {isAllowed} from './admin-allowlist';
import {createClient} from './supabase/server';

/**
 * The server-side gate for every protected /admin page. Redirects to the login
 * page unless the request carries a valid session whose email is allowlisted.
 *
 * Uses `getClaims()` (verifies the JWT) — never `getSession()` in server code.
 * Blueprint §5: authorization is checked on the server, never only in the UI.
 */
export async function requireAdmin(): Promise<{email: string}> {
  const supabase = await createClient();
  const {data} = await supabase.auth.getClaims();
  const email = (data?.claims as {email?: string} | undefined)?.email;
  if (!isAllowed(email)) {
    redirect('/admin/login');
  }
  return {email: email!};
}
