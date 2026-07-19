import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import LocationCard from '@/src/components/location-card';
import {Link} from '@/src/i18n/navigation';
import {CITY_NAMES, parseCity} from '@/src/lib/cities';
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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10 text-black dark:text-zinc-100">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('heading', {city: name})}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('intro', {city: name})}</p>
        <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          {t('backToSearch')}
        </Link>
      </header>

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
