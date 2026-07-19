import type {Metadata} from 'next';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {Link} from '@/src/i18n/navigation';
import {listCuisinesWithLocations} from '@/src/services/cuisines';

// Regenerate hourly so categories that gain/lose locations as data is entered
// show up without a rebuild (same reasoning as the sitemap + /jela).
export const revalidate = 3600;

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Kategorije — lokali po vrsti hrane | BiteRadar';
  const description =
    'Pregledaj lokale po kategoriji hrane — roštilj, pekara, domaća kuhinja i još — u Novom Sadu i Beogradu.';
  return {title, description, openGraph: {title, description}};
}

export default async function CuisinesIndexPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Cuisines');

  const cuisines = await listCuisinesWithLocations();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 text-black dark:text-zinc-100">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('intro')}</p>
      </header>

      {cuisines.length === 0 ? (
        <p className="text-sm text-zinc-500">{t('empty')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {cuisines.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/kuhinja/${c.slug}`}
                className="inline-block rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:border-black hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:bg-zinc-900"
              >
                {c.nameSr}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
