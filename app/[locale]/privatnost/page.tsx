import type {Metadata} from 'next';
import {getTranslations, setRequestLocale} from 'next-intl/server';
import {LegalPage} from '@/src/components/legal-page';

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Privacy'});
  const title = t('title');
  const description = t('metaDescription');
  return {title, description, openGraph: {title, description}};
}

export default async function PrivacyPage({params}: Props) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Privacy');
  return (
    <LegalPage
      title={t('title')}
      intro={t('intro')}
      updated={t('updated')}
      sections={t.raw('sections') as {h: string; p: string}[]}
    />
  );
}
