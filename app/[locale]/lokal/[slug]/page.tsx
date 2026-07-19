import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import JsonLd from '@/src/components/json-ld';
import {Link} from '@/src/i18n/navigation';
import {CITY_NAMES as CITY} from '@/src/lib/cities';
import {restaurantJsonLd} from '@/src/lib/jsonld';
import {getPublishedLocationBySlug} from '@/src/services/locations';

// Weekday display order (Monday first); DB uses 0 = Sunday.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

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

  // Group menu items by section, preserving sortOrder (menu is pre-ordered).
  const sections = new Map<string, typeof loc.menu>();
  for (const item of loc.menu) {
    const key = item.sectionName;
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key)!.push(item);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-10 text-black dark:text-zinc-100">
      <JsonLd data={restaurantJsonLd(loc, locale)} />
      {/* Header */}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {loc.brand.name}
          {loc.location.label ? (
            <span className="text-zinc-500"> · {loc.location.label}</span>
          ) : null}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {loc.location.address}, {CITY[loc.location.city]}
        </p>
        {loc.brand.description ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {loc.brand.description}
          </p>
        ) : null}
        <span
          className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${
            cards === 'yes'
              ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
              : cards === 'no'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
          }`}
        >
          {cards === 'yes'
            ? t('cardsYes')
            : cards === 'no'
              ? t('cardsNo')
              : t('cardsUnknown')}
        </span>
      </header>

      {/* Photos */}
      {loc.photos.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {t('photos')}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {loc.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.url}
                alt={p.altText ?? loc.brand.name}
                loading="lazy"
                className="h-40 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Opening hours */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t('openingHours')}
        </h2>
        <table className="w-full max-w-sm text-sm">
          <tbody>
            {WEEK.map((day) => {
              const h = openByDay.get(day);
              return (
                <tr key={day} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-1.5 text-zinc-600 dark:text-zinc-400">
                    {t(`days.${day}`)}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {h ? (
                      `${h.opensAt}–${h.closesAt}`
                    ) : (
                      <span className="text-zinc-400">{t('closed')}</span>
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {t('menu')}
        </h2>
        {loc.menu.length === 0 ? (
          <p className="text-sm text-zinc-500">{t('noMenu')}</p>
        ) : (
          [...sections.entries()].map(([section, items]) => (
            <div key={section || '_'} className="flex flex-col gap-2">
              {section ? (
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {section}
                </h3>
              ) : null}
              <ul className="flex flex-col gap-2">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between gap-4 border-b border-zinc-100 pb-2 dark:border-zinc-900"
                  >
                    <div className="flex flex-col">
                      {item.dishSlug ? (
                        <Link
                          href={`/jelo/${item.dishSlug}`}
                          className="w-fit hover:underline"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <span>{item.name}</span>
                      )}
                      {item.description ? (
                        <span className="text-xs text-zinc-500">
                          {item.description}
                        </span>
                      ) : null}
                    </div>
                    <span className="whitespace-nowrap tabular-nums text-zinc-700 dark:text-zinc-300">
                      {t('priceRsd', {amount: item.priceRsd})}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
