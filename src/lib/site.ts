/**
 * Absolute site origin for SEO artifacts (sitemap, robots, canonical/OG URLs),
 * which Next requires as absolute — a request-relative path won't do.
 *
 * Set `NEXT_PUBLIC_SITE_URL` to the canonical domain in Vercel env once
 * biteradar.com is live. The localhost default keeps dev + `next build` working
 * without config. No trailing slash (callers build `${siteUrl()}/path`).
 */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}
