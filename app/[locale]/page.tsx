import {getTranslations, setRequestLocale} from 'next-intl/server';
import JsonLd from '@/src/components/json-ld';
import LocationCard from '@/src/components/location-card';
import {CITY_NAMES, parseCity} from '@/src/lib/cities';
import {listingJsonLd} from '@/src/lib/jsonld';
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

  const results = await listPublishedLocations({q, city, openNow});
  const hasFilter = Boolean(q || city || openNow);

  // Segmented control options: "all" + the two launch cities.
  const cityOptions: {value: string; label: string}[] = [
    {value: '', label: t('allCities')},
    {value: 'ns', label: CITY_NAMES.ns},
    {value: 'bg', label: CITY_NAMES.bg},
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 text-black dark:text-zinc-100">
      {results.length ? <JsonLd data={listingJsonLd('BiteRadar', results, locale)} /> : null}
      <h1 className="max-w-2xl text-2xl font-semibold tracking-tight">
        {t('tagline')}
      </h1>

      {/* URL-driven search — a plain GET form, no client JS. */}
      <form method="get" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t('searchPlaceholder')}
            aria-label={t('searchPlaceholder')}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300"
          >
            {t('search')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cityOptions.map((opt) => (
            <label key={opt.value || 'all'} className="cursor-pointer">
              <input
                type="radio"
                name="city"
                value={opt.value}
                defaultChecked={(city ?? '') === opt.value}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 peer-checked:border-black peer-checked:bg-black peer-checked:text-white dark:border-zinc-700 dark:text-zinc-300 dark:peer-checked:border-zinc-100 dark:peer-checked:bg-zinc-100 dark:peer-checked:text-black">
                {opt.label}
              </span>
            </label>
          ))}

          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              name="openNow"
              defaultChecked={openNow}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
            />
            {t('openNow')}
          </label>
        </div>
      </form>

      {results.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {hasFilter ? t('noResults') : t('resultsNone')}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((loc) => (
            <LocationCard key={loc.slug} loc={loc} />
          ))}
        </div>
      )}
    </main>
  );
}
