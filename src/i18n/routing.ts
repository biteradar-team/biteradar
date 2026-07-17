import {defineRouting} from 'next-intl/routing';

/**
 * Single source of truth for BiteRadar's locales and URL strategy.
 *
 * Blueprint §9: srpski (latinica) je primaran i ide BEZ prefiksa,
 * engleski (za turiste) ide na `/en/...`. `localePrefix: 'as-needed'`
 * je upravo to — podrazumevani jezik nema prefiks, svi ostali ga imaju.
 */
export const routing = defineRouting({
  // Both locales ship from day one (blueprint §9 / §4 — "USVOJENO").
  locales: ['sr', 'en'],

  // Serbian is the default → served at "/" with no locale segment.
  defaultLocale: 'sr',

  // 'as-needed'  → "/" = sr, "/en/..." = en.
  // ('always' would force "/sr/...", 'never' would hide all prefixes.)
  localePrefix: 'as-needed',

  // Serve "/" as Serbian deterministically instead of auto-redirecting
  // based on the browser's Accept-Language header. Keeps the default
  // predictable; visitors reach English by going to /en (or a future
  // language switcher). Flip to `true` later if we want tourists on an
  // English browser to land on /en automatically.
  localeDetection: false
});

// Handy union type ('sr' | 'en') for typing locale values elsewhere.
export type Locale = (typeof routing.locales)[number];
