import {getTranslations, setRequestLocale} from 'next-intl/server';
import CityChips, {
  CardsChip,
  CuisineSelect,
  LateNightChip,
  NoJsSubmit,
  OpenNowChip,
  PriceChips,
} from '@/src/components/filter-fields';
import Filters from '@/src/components/filters';
import {SearchIcon} from '@/src/components/icons';
import JsonLd from '@/src/components/json-ld';
import LocationsMap from '@/src/components/locations-map';
import NearMeButton from '@/src/components/near-me-button';
import ResultsGrid from '@/src/components/results-grid';
import SearchTracker from '@/src/components/search-tracker';
import {PageShell} from '@/src/components/shell';
import {Link} from '@/src/i18n/navigation';
import {parseCity} from '@/src/lib/cities';
import {listingJsonLd} from '@/src/lib/jsonld';
import {parseCoords} from '@/src/lib/maptiler';
import {parsePriceBand} from '@/src/lib/prices';
import {listCuisinesWithLocations} from '@/src/services/cuisines';
import {listDishesWithOffers} from '@/src/services/dishes';
import {listPublishedLocations} from '@/src/services/locations';

// Reading searchParams makes this route dynamic (server-rendered per request),
// which is what we want — the list reflects the live query/filters.
type Props = {
  params: Promise<{locale: string}>;
  searchParams: Promise<{
    q?: string;
    city?: string;
    openNow?: string;
    late?: string;
    cards?: string;
    cuisine?: string;
    price?: string;
    lat?: string;
    lng?: string;
  }>;
};

export default async function Home({params, searchParams}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Home');

  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const city = parseCity(sp.city);
  const openNow = Boolean(sp.openNow);
  const late = Boolean(sp.late);
  const cards = Boolean(sp.cards);
  const price = parsePriceBand(sp.price);
  // Not validated against the cuisine list — an unknown slug simply matches
  // nothing and falls through to the empty state.
  const cuisine = sp.cuisine?.trim() || undefined;
  // „Blizu mene": the user's position from the geolocation button. Validated at
  // the trust boundary because it flows into a SQL distance sort.
  const near = parseCoords(sp.lat, sp.lng);

  // The dish rail is the product's actual claim — "find the dish, not the
  // restaurant" — so it goes above the results. `listDishesWithOffers` only
  // returns dishes that some location actually prices, so the rail simply
  // disappears rather than rendering empty chips. Same for the cuisine select.
  const [results, dishes, cuisines] = await Promise.all([
    listPublishedLocations({q, city, openNow, late, cards, cuisine, price, near}),
    listDishesWithOffers(),
    listCuisinesWithLocations(),
  ]);

  const hasFilter = Boolean(
    q || city || openNow || late || cards || cuisine || price || near,
  );

  return (
    <PageShell>
      {results.length ? (
        <JsonLd data={listingJsonLd('BiteRadar', results, locale)} />
      ) : null}
      <SearchTracker q={q} count={results.length} />


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
              <CuisineSelect
                cuisines={cuisines}
                selected={cuisine}
                locale={locale}
              />
              <OpenNowChip checked={openNow} />
              <LateNightChip checked={late} />
              <CardsChip checked={cards} />
              <NearMeButton
                label={t('nearMe')}
                errorLabel={t('nearMeError')}
                active={Boolean(near)}
              />
            </div>

            {/* Price on its own row — four chips plus the row above would wrap
                into a ragged block on a phone. */}
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <PriceChips selected={price} />
              {hasFilter ? (
                // A plain link, so resetting works with JS off too.
                <Link
                  href="/"
                  className="ml-auto text-sm text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
                >
                  {t('clearFilters')}
                </Link>
              ) : null}
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
          {/* Map is fed by the SAME `results` the list renders, so the two can
              never disagree. Hidden when there's nothing to place (no results and
              no „you" pin). */}
          {results.length || near ? (
            <LocationsMap
              pins={results.map((r) => ({
                slug: r.slug,
                name: r.brandName,
                lat: r.lat,
                lng: r.lng,
              }))}
              userLoc={near}
              locale={locale}
              className="h-72 sm:h-96"
            />
          ) : null}
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
