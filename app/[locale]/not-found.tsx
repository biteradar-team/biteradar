import {getTranslations} from 'next-intl/server';
import {PinIcon} from '@/src/components/icons';
import {PageShell} from '@/src/components/shell';
import {Link} from '@/src/i18n/navigation';

/**
 * Shown for every notFound() on the public site — unknown locale, missing
 * location, dish or cuisine. Until now these all fell through to Next's
 * unstyled default page.
 */
export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <PageShell width="narrow" className="items-center justify-center text-center">
      <PinIcon className="size-10 text-paprika opacity-40" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold sm:text-4xl">{t('heading')}</h1>
        <p className="text-[15px] text-ink-muted">{t('intro')}</p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-paprika px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        {t('backHome')}
      </Link>
    </PageShell>
  );
}
