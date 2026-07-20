import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import JsonLd from '@/src/components/json-ld';
import ResultsGrid from '@/src/components/results-grid';
import {PageHeader, PageShell} from '@/src/components/shell';
import {CITY_NAMES, parseCity} from '@/src/lib/cities';
import {listingJsonLd} from '@/src/lib/jsonld';
import {listPublishedLocations} from '@/src/services/locations';

// DB-backed, so dynamic (server-rendered per request) like the profile page.
type Props = {params: Promise<{locale: string; city: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {city} = await params;
  const parsed = parseCity(city);
  if (!parsed) return {title: 'BiteRadar'};
  const name = CITY_NAMES[parsed];
  const title = `Restorani i lokali u ${name} | BiteRadar`;
  const description = `Pretraži restorane i jela u ${name} — meni sa cenama, radno vreme i fotografije na BiteRadaru.`;
  return {title, description, openGraph: {title, description}};
}

export default async function CityPage({params}: Props) {
  const {locale, city} = await params;
  setRequestLocale(locale);
  const parsed = parseCity(city);
  if (!parsed) notFound();

  const t = await getTranslations('City');
  const th = await getTranslations('Home');
  const results = await listPublishedLocations({city: parsed});
  const name = CITY_NAMES[parsed];

  return (
    <PageShell>
      {results.length ? (
        <JsonLd
          data={listingJsonLd(t('heading', {city: name}), results, locale)}
        />
      ) : null}

      <PageHeader
        back={{href: '/', label: t('backToSearch')}}
        title={t('heading', {city: name})}
        intro={t('intro', {city: name})}
      />

      <div className="flex flex-col gap-4">
        {results.length ? (
          <p className="text-sm text-ink-muted">
            {th('resultsCount', {count: results.length})}
          </p>
        ) : null}
        <ResultsGrid locations={results} empty={th('resultsNone')} />
      </div>
    </PageShell>
  );
}
