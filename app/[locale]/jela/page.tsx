import type {Metadata} from 'next';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {ChipLinks, EmptyState, PageHeader, PageShell} from '@/src/components/shell';
import {listDishesWithOffers} from '@/src/services/dishes';

// Regenerate hourly so dishes that gain/lose offers as data is entered show up
// without a rebuild (same reasoning as the sitemap).
export const revalidate = 3600;

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Jela — cene po lokalima | BiteRadar';
  const description =
    'Pregledaj jela i uporedi njihove cene po restoranima i lokalima u Novom Sadu i Beogradu.';
  return {title, description, openGraph: {title, description}};
}

export default async function DishesIndexPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Dishes');

  const dishes = await listDishesWithOffers();

  return (
    <PageShell width="narrow">
      <PageHeader title={t('heading')} intro={t('intro')} />
      {dishes.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <ChipLinks items={dishes} hrefPrefix="/jelo" />
      )}
    </PageShell>
  );
}
