import type {Metadata} from 'next';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {ChipLinks, EmptyState, PageHeader, PageShell} from '@/src/components/shell';
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
    <PageShell width="narrow">
      <PageHeader title={t('heading')} intro={t('intro')} />
      {cuisines.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <ChipLinks items={cuisines} hrefPrefix="/kuhinja" />
      )}
    </PageShell>
  );
}
