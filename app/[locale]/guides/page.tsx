import type {Metadata} from 'next';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {EmptyState, PageHeader, PageShell} from '@/src/components/shell';
import {GUIDES} from '@/src/content/guides';
import {Link} from '@/src/i18n/navigation';

// Regenerate hourly, same as /jela and /kuhinje (guides are static data today,
// but this keeps the cache policy uniform for when they're edited).
export const revalidate = 3600;

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Vodiči za goste — BiteRadar';
  const description =
    'Kratki vodiči kroz srpsku kuhinju sa cenama po lokalima u Novom Sadu i Beogradu.';
  return {title, description, openGraph: {title, description}};
}

export default async function GuidesIndexPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const l = locale === 'en' ? 'en' : 'sr';
  const t = await getTranslations('Guides');

  return (
    <PageShell width="narrow">
      <PageHeader title={t('heading')} intro={t('intro')} />
      {GUIDES.length === 0 ? (
        <EmptyState>{t('empty')}</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="block rounded-xl border border-line bg-card p-4 transition-colors hover:border-paprika hover:bg-raised"
              >
                <p className="font-semibold text-ink">{g.title[l]}</p>
                <p className="mt-1 text-sm text-ink-muted">{g.intro[l]}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
