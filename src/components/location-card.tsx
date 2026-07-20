import Image from 'next/image';
import {useTranslations} from 'next-intl';
import {Link} from '@/src/i18n/navigation';
import {CITY_NAMES} from '@/src/lib/cities';
import type {PublicLocationSummary} from '@/src/services/locations';
import Pill from './pill';

/**
 * One result in a location list. Links to the full profile via the locale-aware
 * `Link` (so `/lokal/…` on sr, `/en/lokal/…` on en).
 *
 * Presentational server component — `useTranslations` (the non-async hook) is
 * legal here in next-intl v4.
 */
export default function LocationCard({loc}: {loc: PublicLocationSummary}) {
  const t = useTranslations('Home');
  const tl = useTranslations('Location');

  return (
    <Link
      href={`/lokal/${loc.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-raised">
        {loc.photoUrl ? (
          <Image
            src={loc.photoUrl}
            alt={loc.brandName}
            fill
            // Cards are 1-up on mobile, 2-up from sm, 3-up from lg inside a
            // 1152px shell. Without this next/image would serve a full-width
            // image to every card.
            sizes="(min-width: 1024px) 368px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          // Previously an empty grey rectangle. A tinted panel with the initial
          // at least looks intentional while photos are missing.
          <div
            className="flex h-full w-full items-center justify-center bg-paprika-tint"
            aria-label={t('noPhoto')}
          >
            <span
              className="font-expanded text-4xl font-bold text-paprika-accent/45"
              aria-hidden
            >
              {loc.brandName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-lg font-semibold leading-tight text-ink">
          {loc.brandName}
          {loc.label ? (
            <span className="font-normal text-ink-muted"> · {loc.label}</span>
          ) : null}
        </h3>
        <p className="text-sm text-ink-muted">
          {loc.address}, {CITY_NAMES[loc.city]}
        </p>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {loc.openNow ? <Pill variant="open">{t('openNow')}</Pill> : null}
          {loc.acceptsCards === 'yes' ? (
            <Pill variant="neutral">{tl('cardsYes')}</Pill>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
