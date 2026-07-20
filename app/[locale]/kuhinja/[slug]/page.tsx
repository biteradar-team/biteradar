import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import CityChips, {NoJsSubmit} from '@/src/components/filter-fields';
import Filters from '@/src/components/filters';
import JsonLd from '@/src/components/json-ld';
import ResultsGrid from '@/src/components/results-grid';
import {PageHeader, PageShell} from '@/src/components/shell';
import {parseCity} from '@/src/lib/cities';
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

  return (
    <PageShell>
      {results.length ? (
        <JsonLd data={listingJsonLd(cuisine.nameSr, results, locale)} />
      ) : null}

      <PageHeader
        back={{href: '/kuhinje', label: t('backToCuisines')}}
        eyebrow={locale === 'en' && cuisine.nameEn ? cuisine.nameEn : undefined}
        title={cuisine.nameSr}
        intro={t('intro', {cuisine: cuisine.nameSr})}
      />

      <Filters
        className="flex flex-wrap items-center gap-2"
        busyLabel={th('filtering')}
        fields={
          <>
            <CityChips selected={city} />
            <NoJsSubmit />
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {results.length ? (
            <p className="text-sm text-ink-muted">
              {th('resultsCount', {count: results.length})}
            </p>
          ) : null}
          <ResultsGrid locations={results} empty={th('resultsNone')} />
        </div>
      </Filters>
    </PageShell>
  );
}
