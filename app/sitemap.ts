import type {MetadataRoute} from 'next';
import {GUIDES} from '@/src/content/guides';
import {routing} from '@/src/i18n/routing';
import {siteUrl} from '@/src/lib/site';
import {listCuisinesWithLocations} from '@/src/services/cuisines';
import {listDishesWithOffers} from '@/src/services/dishes';
import {getPublishedLocationSlugs} from '@/src/services/locations';

/**
 * /sitemap.xml — home, both city landing pages, and every published location
 * profile, in both locales. Served at the app root (the proxy matcher skips
 * dotted paths, so it never hits locale routing).
 *
 * URL strategy mirrors `routing` (`localePrefix: 'as-needed'`): the default
 * locale (sr) has no prefix, others get `/en`. Each logical route emits one
 * entry per locale, all sharing an hreflang `alternates.languages` map.
 */
// Regenerate hourly so locations published between deploys get listed without a
// rebuild (admin data entry doesn't trigger one).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [slugs, dishes, cuisines] = await Promise.all([
    getPublishedLocationSlugs(),
    listDishesWithOffers(),
    listCuisinesWithLocations(),
  ]);

  const url = (locale: string, path: string) =>
    `${base}${locale === routing.defaultLocale ? '' : `/${locale}`}${path}`;

  const routes: {path: string; lastModified?: Date}[] = [
    {path: ''},
    {path: '/grad/ns'},
    {path: '/grad/bg'},
    {path: '/jela'},
    ...dishes.map((d) => ({path: `/jelo/${d.slug}`})),
    {path: '/kuhinje'},
    ...cuisines.map((c) => ({path: `/kuhinja/${c.slug}`})),
    {path: '/guides'},
    ...GUIDES.map((g) => ({path: `/guides/${g.slug}`})),
    {path: '/privatnost'},
    {path: '/uslovi'},
    ...slugs.map((s) => ({path: `/lokal/${s.slug}`, lastModified: s.updatedAt})),
  ];

  return routes.flatMap(({path, lastModified}) => {
    const languages = Object.fromEntries(
      routing.locales.map((l) => [l, url(l, path)]),
    );
    return routing.locales.map((l) => ({
      url: url(l, path),
      lastModified,
      alternates: {languages},
    }));
  });
}
