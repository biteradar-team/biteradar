import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import JsonLd from '@/src/components/json-ld';
import {PageHeader, PageShell} from '@/src/components/shell';
import {getGuideBySlug, GUIDES} from '@/src/content/guides';
import {Link} from '@/src/i18n/navigation';
import {articleJsonLd} from '@/src/lib/jsonld';

type Props = {params: Promise<{locale: string; slug: string}>};

export function generateStaticParams() {
  return GUIDES.map((g) => ({slug: g.slug}));
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale, slug} = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {title: 'BiteRadar'};
  const l = locale === 'en' ? 'en' : 'sr';
  const title = `${guide.title[l]} | BiteRadar`;
  const description = guide.intro[l];
  return {title, description, openGraph: {title, description}};
}

export default async function GuidePage({params}: Props) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const l = locale === 'en' ? 'en' : 'sr';
  const t = await getTranslations('Guides');

  return (
    <PageShell width="narrow">
      <JsonLd data={articleJsonLd(guide, l)} />

      <PageHeader
        back={{href: '/guides', label: t('backToGuides')}}
        title={guide.title[l]}
        intro={guide.intro[l]}
      />

      <div className="flex flex-col gap-8">
        {guide.sections.map((s, i) => (
          <section key={i} className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold text-ink">{s.heading[l]}</h2>
            <p className="text-[15px] text-ink-muted">{s.body[l]}</p>
            {s.dishSlug ? (
              <Link
                href={`/jelo/${s.dishSlug}`}
                className="w-fit text-sm font-medium text-paprika-accent hover:underline"
              >
                {t('viewPrices')}
                {' →'}
              </Link>
            ) : null}
            {s.locationSlug ? (
              <Link
                href={`/lokal/${s.locationSlug}`}
                className="w-fit text-sm font-medium text-paprika-accent hover:underline"
              >
                {t('viewLocation')}
                {' →'}
              </Link>
            ) : null}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
