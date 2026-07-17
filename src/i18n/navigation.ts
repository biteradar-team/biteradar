import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';

/**
 * Locale-aware replacements for Next's navigation APIs.
 *
 * Import `Link` etc. from here instead of `next/link` / `next/navigation`
 * so links automatically carry the active locale — and correctly OMIT the
 * prefix for `sr` while adding `/en` for English. We don't use these on the
 * homepage yet, but they're the foundation for the language switcher and all
 * internal links, so the whole app follows one routing convention.
 */
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
