import createMiddleware from 'next-intl/middleware';
import {routing} from './src/i18n/routing';

/**
 * Locale routing entry point.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy`
 * (see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 * next-intl still exposes its locale router as a middleware factory whose
 * return value is a plain `(request) => response` handler, so we simply mount
 * that handler as the default export of `proxy.ts`.
 *
 * This runs before rendering and, for `localePrefix: 'as-needed'`:
 *   "/"        → serves the `sr` messages (rewrite to the [locale] segment)
 *   "/en/..."  → serves the `en` messages
 */
export default createMiddleware(routing);

export const config = {
  // Run on app routes only. Skip API routes, Next internals, and any path
  // containing a dot (static assets like favicon.ico, images, etc.).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)'
};
