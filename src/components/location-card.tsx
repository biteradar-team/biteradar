import {useTranslations} from 'next-intl';
import {CITY_NAMES} from '@/src/lib/cities';
import {Link} from '@/src/i18n/navigation';
import type {PublicLocationSummary} from '@/src/services/locations';

/**
 * One result on the public home list. Links to the full profile via the
 * locale-aware `Link` (so `/lokal/…` on sr, `/en/lokal/…` on en). Presentational
 * server component — mirrors the styling of the profile page header.
 */
export default function LocationCard({loc}: {loc: PublicLocationSummary}) {
  const t = useTranslations('Home');
  const tl = useTranslations('Location');

  return (
    <Link
      href={`/lokal/${loc.slug}`}
      className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
    >
      <div className="aspect-[3/2] w-full bg-zinc-100 dark:bg-zinc-900">
        {loc.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={loc.photoUrl}
            alt={loc.brandName}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-medium text-black dark:text-zinc-100">
          {loc.brandName}
          {loc.label ? <span className="text-zinc-500"> · {loc.label}</span> : null}
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {loc.address}, {CITY_NAMES[loc.city]}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {loc.openNow ? (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
              {t('openNow')}
            </span>
          ) : null}
          {loc.acceptsCards === 'yes' ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {tl('cardsYes')}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
