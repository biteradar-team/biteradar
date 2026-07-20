import {getTranslations, setRequestLocale} from 'next-intl/server';
import CityChips, {NoJsSubmit} from '@/src/components/filter-fields';
import Filters from '@/src/components/filters';
import {SearchIcon} from '@/src/components/icons';
import JsonLd from '@/src/components/json-ld';
import ResultsGrid from '@/src/components/results-grid';
import {PageShell} from '@/src/components/shell';
import {Link} from '@/src/i18n/navigation';
import {parseCity} from '@/src/lib/cities';
import {listingJsonLd} from '@/src/lib/jsonld';
import {listDishesWithOffers} from '@/src/services/dishes';
import {listPublishedLocations} from '@/src/services/locations';

// Reading searchParams makes this route dynamic (server-rendered per request),
// which is what we want — the list reflects the live query/filters.
type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{q?: string; city?: string; openNow?: string}>;
};

export default async function Home({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home');

  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const city = parseCity(sp.city);
  const openNow = Boolean(sp.openNow);

  // The dish rail is the product's actual claim — "find the dish, not the
  // restaurant" — so it goes above the results. `listDishesWithOffers` only
  // returns dishes that some location actually prices, so the rail simply
  // disappears rather than rendering empty chips.
  const [results, dishes] = await Promise.all([
    listPublishedLocations({q, city, openNow}),
    listDishesWithOffers(),
  ]);

  const hasFilter = Boolean(q || city || openNow);

  return (
    <PageShell>
      {results.length ? (
        <JsonLd data={listingJsonLd('BiteRadar', results, locale)} />
      ) : null}

      <h1 className="max-w-2xl text-4xl font-bold text-balance sm:text-5xl">
        {t('tagline')}
      </h1>

      <Filters
        className="flex flex-col gap-4"
        busyLabel={t('filtering')}
        fields={
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-ink-muted" />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder={t('searchPlaceholder')}
                  aria-label={t('searchPlaceholder')}
                  className="w-full rounded-lg border border-line-strong bg-card py-3 pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-muted"
                />
              </div>
              <NoJsSubmit />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CityChips selected={city} />

              <label className="ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  name="openNow"
                  defaultChecked={openNow}
                  className="peer sr-only"
                />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-ink-muted hover:text-ink peer-checked:border-open peer-checked:bg-open-tint peer-checked:font-medium peer-checked:text-open peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring">
                  <span className="size-1.5 rounded-full bg-current" aria-hidden />
                  {t('openNow')}
                </span>
              </label>
            </div>

            {dishes.length ? (
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <h2 className="font-expanded text-[11px] font-semibold uppercase text-ink-muted">
                  {t('popularDishes')}
                </h2>
                {/* Scrolls sideways on narrow screens rather than wrapping into
                    a tall block that pushes the results off-screen. */}
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                  {dishes.map((dish) => (
                    <Link
                      key={dish.slug}
                      href={`/jelo/${dish.slug}`}
                      className="whitespace-nowrap rounded-full bg-raised px-3.5 py-1.5 text-sm text-ink transition-colors hover:bg-paprika hover:text-white"
                    >
                      {dish.nameSr}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {results.length ? (
            <p className="text-sm text-ink-muted">
              {t('resultsCount', {count: results.length})}
            </p>
          ) : null}
          <ResultsGrid
            locations={results}
            empty={hasFilter ? t('noResults') : t('resultsNone')}
          />
        </div>
      </Filters>
    </PageShell>
  );
}
