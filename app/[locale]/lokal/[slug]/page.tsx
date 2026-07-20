import type {Metadata} from 'next';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {ChevronRightIcon} from '@/src/components/icons';
import JsonLd from '@/src/components/json-ld';
import LocationsMap from '@/src/components/locations-map';
import Pill from '@/src/components/pill';
import {PageShell} from '@/src/components/shell';
import VerifiedBadge from '@/src/components/verified-badge';
import {Link} from '@/src/i18n/navigation';
import {CITY_NAMES as CITY} from '@/src/lib/cities';
import {restaurantJsonLd} from '@/src/lib/jsonld';
import {REPORT_EMAIL, siteUrl} from '@/src/lib/site';
import {getPublishedLocationBySlug} from '@/src/services/locations';

// Weekday display order (Monday first); DB uses 0 = Sunday.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

// Maps Intl's weekday name back to the DB's 0-6 index, so "today" can be
// highlighted in the venue's own timezone rather than the server's.
const DAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function belgradeWeekday(): number {
  const name = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Belgrade',
    weekday: 'long',
  }).format(new Date());
  return DAY_INDEX[name] ?? -1;
}

type Params = {params: Promise<{locale: string; slug: string}>};

export async function generateMetadata({params}: Params): Promise<Metadata> {
  const {slug} = await params;
  const loc = await getPublishedLocationBySlug(slug);
  if (!loc) return {title: 'BiteRadar'};
  const city = CITY[loc.location.city];
  const title = `${loc.brand.name} — ${city} | BiteRadar`;
  const description = `${loc.brand.name}, ${loc.location.address}, ${city}. Radno vreme, meni sa cenama i fotografije na BiteRadaru.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: loc.photos.length ? [loc.photos[0].url] : undefined,
    },
  };
}

export default async function LocationProfile({params}: Params) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Location');

  const loc = await getPublishedLocationBySlug(slug);
  if (!loc) notFound();

  const openByDay = new Map(loc.hours.map((h) => [h.day, h]));
  const cards = loc.location.acceptsCards;
  const today = belgradeWeekday();

  const [hero, ...restPhotos] = loc.photos;

  // „Prijavi netačan podatak" — plain mailto, no accounts (§3.1). The canonical
  // URL in the body tells us which location the report is about.
  const profileUrl = `${siteUrl()}/lokal/${loc.slug}`;
  const reportHref =
    `mailto:${REPORT_EMAIL}` +
    `?subject=${encodeURIComponent(t('reportSubject', {name: loc.brand.name}))}` +
    `&body=${encodeURIComponent(t('reportBody', {url: profileUrl}))}`;

  // Group menu items by section, preserving sortOrder (menu is pre-ordered).
  const sections = new Map<string, typeof loc.menu>();
  for (const item of loc.menu) {
    const key = item.sectionName;
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(item);
  }

  const sectionHeading =
    'font-expanded text-[11px] font-semibold uppercase text-ink-muted';

  const title = (
    <>
      {loc.brand.name}
      {loc.location.label ? (
        <span className="font-normal opacity-70"> · {loc.location.label}</span>
      ) : null}
    </>
  );

  return (
    <PageShell width="narrow">
      <JsonLd data={restaurantJsonLd(loc, locale)} />

      {/* Header. With a photo the name sits over it; without one it falls back
          to a plain heading rather than an empty grey band. */}
      {hero ? (
        <div className="relative -mx-4 aspect-[16/10] overflow-hidden sm:mx-0 sm:aspect-[2/1] sm:rounded-xl">
          <Image
            src={hero.url}
            alt={hero.altText ?? loc.brand.name}
            fill
            priority
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
          />
          {/* Scrim, so the name stays legible over any photo. */}
          <div className="absolute inset-0 bg-gradient-to-t from-scrim via-scrim/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-6">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            <p className="text-sm text-white/80">
              {loc.location.address}, {CITY[loc.location.city]}
            </p>
          </div>
        </div>
      ) : (
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="text-sm text-ink-muted">
            {loc.location.address}, {CITY[loc.location.city]}
          </p>
        </header>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {cards === 'yes' ? (
            <Pill variant="neutral">{t('cardsYes')}</Pill>
          ) : cards === 'no' ? (
            <Pill variant="warn">{t('cardsNo')}</Pill>
          ) : (
            <Pill variant="neutral">{t('cardsUnknown')}</Pill>
          )}
          {loc.cuisines.map((c) => (
            <Pill key={c} variant="neutral">
              {c}
            </Pill>
          ))}
          <VerifiedBadge verifiedAt={loc.verifiedAt} locale={locale} />
        </div>

        {loc.brand.description ? (
          <p className="max-w-prose text-[15px] text-ink-muted">
            {loc.brand.description}
          </p>
        ) : null}
      </div>

      {/* Location map — one pin. Reuses the home map component; coords are always
          present (geog is NOT NULL). Hidden when no MapTiler key is set. */}
      <section className="flex flex-col gap-3">
        <h2 className={sectionHeading}>{t('mapHeading')}</h2>
        <LocationsMap
          pins={[
            {
              slug: loc.slug,
              name: loc.brand.name,
              lat: loc.location.lat,
              lng: loc.location.lng,
            },
          ]}
          locale={locale}
          className="h-64"
        />
      </section>

      {/* Remaining photos */}
      {restPhotos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className={sectionHeading}>{t('photos')}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {restPhotos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-[4/3] overflow-hidden rounded-lg bg-raised"
              >
                <Image
                  src={p.url}
                  alt={p.altText ?? loc.brand.name}
                  fill
                  sizes="(min-width: 640px) 240px, 45vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Opening hours */}
      <section className="flex flex-col gap-3">
        <h2 className={sectionHeading}>{t('openingHours')}</h2>
        <table className="w-full max-w-sm overflow-hidden rounded-lg border border-line text-sm">
          <tbody>
            {WEEK.map((day) => {
              const h = openByDay.get(day);
              const isToday = day === today;
              return (
                <tr
                  key={day}
                  className={`border-b border-line last:border-b-0 ${
                    isToday ? 'bg-raised' : ''
                  }`}
                >
                  <td
                    className={`px-3 py-2 ${isToday ? 'font-medium text-ink' : 'text-ink-muted'}`}
                  >
                    {t(`days.${day}`)}
                    {isToday ? (
                      <span className="ml-2 text-xs text-paprika-accent">
                        {t('today')}
                      </span>
                    ) : null}
                  </td>
                  <td className="num px-3 py-2 text-right">
                    {h ? (
                      <span className={isToday ? 'text-ink' : 'text-ink-muted'}>
                        {h.opensAt}–{h.closesAt}
                      </span>
                    ) : (
                      <span className="text-ink-muted opacity-70">
                        {t('closed')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Menu */}
      <section className="flex flex-col gap-4">
        <h2 className={sectionHeading}>{t('menu')}</h2>
        {loc.menu.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('noMenu')}</p>
        ) : (
          [...sections.entries()].map(([section, items]) => (
            <div key={section || '_'} className="flex flex-col gap-1">
              {section ? (
                <h3 className="text-base font-semibold text-ink">{section}</h3>
              ) : null}
              <ul className="flex flex-col">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-b-0"
                  >
                    <div className="flex items-baseline gap-2">
                      {item.dishSlug ? (
                        // The hook into price comparison: this dish exists on
                        // other menus, so we can show what it costs elsewhere.
                        <Link
                          href={`/jelo/${item.dishSlug}`}
                          className="group inline-flex items-baseline gap-0.5 text-ink hover:text-paprika-accent"
                          title={t('comparePrices')}
                        >
                          {item.name}
                          <ChevronRightIcon className="size-3.5 shrink-0 translate-y-0.5 text-paprika-accent" />
                        </Link>
                      ) : (
                        <span className="text-ink">{item.name}</span>
                      )}
                      {/* Dotted leader stretches to fill the gap. */}
                      <span className="leader h-3.5 min-w-4 flex-1" aria-hidden />
                      <span className="num shrink-0 font-medium text-ink">
                        {t('priceRsd', {amount: item.priceRsd})}
                      </span>
                    </div>
                    {item.description ? (
                      <span className="text-sm text-ink-muted">
                        {item.description}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {/* Report inaccuracy — plain link, zero JS. */}
      <p className="text-sm text-ink-muted">
        <a href={reportHref} className="underline hover:text-ink">
          {t('reportInaccuracy')}
        </a>
      </p>
    </PageShell>
  );
}
