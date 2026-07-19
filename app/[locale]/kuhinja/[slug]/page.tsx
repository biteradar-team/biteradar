import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import JsonLd from '@/src/components/json-ld';
import LocationCard from '@/src/components/location-card';
import {Link} from '@/src/i18n/navigation';
import {CITY_NAMES, parseCity} from '@/src/lib/cities';
import {listingJsonLd} from '@/src/lib/jsonld';
import {getCuisineBySlug} from '@/src/services/cuisines';
import {listPublishedLocations} from '@/src/services/locations';

type Props = {
  params: Promise<{locale: string; slug: string}>;
  searchParams: Promise<{city?: string}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params;
  const cuisine = await getCuisineBySlug(slug);
  if (!cuisine) return {title: 'BiteRadar'};
  const title = `${cuisine.nameSr} — lokali i cene | BiteRadar`;
  const description = `Lokali sa kategorijom „${cuisine.nameSr}" u Novom Sadu i Beogradu — meni sa cenama, radno vreme i fotografije na BiteRadaru.`;
  return {title, description, openGraph: {title, description}};
}

export default async function CuisinePage({params, searchParams}: Props) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const cuisine = await getCuisineBySlug(slug);
  if (!cuisine) notFound();

  const t = await getTranslations('Cuisine');
  const th = await getTranslations('Home');

  const city = parseCity((await searchParams).city);
  const results = await listPublishedLocations({cuisine: cuisine.id, city});

  const cityOptions: {value: string; label: string}[] = [
    {value: '', label: th('allCities')},
    {value: 'ns', label: CITY_NAMES.ns},
    {value: 'bg', label: CITY_NAMES.bg},
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 text-black dark:text-zinc-100">
      {results.length ? (
        <JsonLd data={listingJsonLd(cuisine.nameSr, results, locale)} />
      ) : null}
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{cuisine.nameSr}</h1>
        {locale === 'en' && cuisine.nameEn ? (
          <p className="text-sm text-zinc-500">{cuisine.nameEn}</p>
        ) : null}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {t('intro', {cuisine: cuisine.nameSr})}
        </p>
        <Link href="/kuhinje" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          {t('backToCuisines')}
        </Link>
      </header>

      {/* City filter — no-JS GET form. */}
      <form method="get" className="flex flex-wrap items-center gap-2">
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
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {th('search')}
        </button>
      </form>

      {results.length === 0 ? (
        <p className="text-sm text-zinc-500">{th('resultsNone')}</p>
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
