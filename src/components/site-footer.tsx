import {getTranslations} from 'next-intl/server';
import {Link} from '@/src/i18n/navigation';
import {CITY_NAMES} from '@/src/lib/cities';
import {PinIcon} from './icons';

/**
 * Site footer. The `footerNote` is deliberate: prices and hours are
 * human-entered and go stale, and saying so is more trustworthy than implying
 * the data is live.
 */
export default async function SiteFooter() {
  const t = await getTranslations('Nav');

  const link = 'text-sm text-ink-muted transition-colors hover:text-ink';
  const heading =
    'font-expanded text-[11px] font-semibold uppercase text-ink-muted';

  return (
    <footer className="mt-16 border-t border-line bg-card">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-ink">
            <PinIcon className="size-5 text-paprika" />
            <span className="font-expanded text-[15px] font-bold">
              {t('brand')}
            </span>
          </div>
          <p className="max-w-xs text-sm text-ink-muted">{t('footerTagline')}</p>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className={heading}>{t('footerBrowse')}</h2>
          <Link href="/jela" className={link}>
            {t('dishes')}
          </Link>
          <Link href="/kuhinje" className={link}>
            {t('categories')}
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className={heading}>{t('footerCities')}</h2>
          <Link href="/grad/ns" className={link}>
            {CITY_NAMES.ns}
          </Link>
          <Link href="/grad/bg" className={link}>
            {CITY_NAMES.bg}
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className={heading}>{t('footerLegal')}</h2>
          <Link href="/privatnost" className={link}>
            {t('privacy')}
          </Link>
          <Link href="/uslovi" className={link}>
            {t('terms')}
          </Link>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-ink-muted sm:px-6">
          {t('footerNote')}
        </p>
      </div>
    </footer>
  );
}
