/**
 * Which signed-in Supabase users may use /admin (blueprint §5 — authorization is
 * checked on the server). Kept pure and env-driven so it's unit-testable and
 * enforced identically in the login action and in `requireAdmin()`. No
 * `server-only` import here on purpose, so vitest can exercise it.
 *
 * There is no admin/users table yet (phase-2, ADR 0001): an admin is simply a
 * signed-in user whose email is in the ADMIN_EMAILS allowlist.
 */
export function isAllowed(
  email: string | null | undefined,
  csv: string | undefined = process.env.ADMIN_EMAILS,
): boolean {
  if (!email) return false;
  const allow = (csv ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(email.toLowerCase());
}
