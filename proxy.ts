import createMiddleware from 'next-intl/middleware';
import type {NextRequest} from 'next/server';
import {routing} from './src/i18n/routing';
import {updateSession} from './src/lib/supabase/middleware';

/**
 * Proxy (Next.js 16 renamed the `middleware` file convention to `proxy`).
 *
 * Two concerns, split by path so neither touches the other:
 *   /admin/*  → Supabase auth session refresh; NOT locale-routed (blueprint §6
 *               puts the internal admin tool outside the localized public area).
 *   else      → next-intl locale routing. For `localePrefix: 'as-needed'`:
 *                 "/"       → sr messages   "/en/..." → en messages
 */
const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return updateSession(request);
  }
  return intlMiddleware(request);
}

export const config = {
  // Run on app routes only. Skip API routes, Next internals, and any path
  // containing a dot (static assets like favicon.ico, images, etc.).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)'
};
