import {getTranslations} from 'next-intl/server';
import {Link} from '@/src/i18n/navigation';
import {CITY_NAMES} from '@/src/lib/cities';
import HeaderActions from './header-actions';
import {PinIcon} from './icons';

/**
 * The site header. Net-new — until now the public site had no chrome at all,
 * which also meant the /en locale was unreachable without typing the URL.
 *
 * Server component; only the language/theme controls are client-side.
 */
export default async function SiteHeader() {
  const t = await getTranslations('Nav');

  const navLink =
    'whitespace-nowrap rounded-md px-2 py-1 text-sm text-ink-muted transition-colors hover:bg-raised hover:text-ink';

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md">
      {/* Standard first-focusable escape hatch for keyboard users. */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:rounded-md focus:bg-paprika focus:px-3 focus:py-1.5 focus:text-sm focus:text-white"
      >
        {t('skipToContent')}
      </a>

      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-ink"
          aria-label={t('brand')}
        >
          <PinIcon className="size-5 text-paprika" />
          <span className="font-expanded text-[15px] font-bold">
            {t('brand')}
          </span>
        </Link>

        {/*
          `min-w-0` + `overflow-x-auto` means the nav gives way instead of
          shoving the language and theme controls off the right edge on a narrow
          phone. Without it a long enough nav breaks the whole bar.
        */}
        <nav className="ml-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:ml-3">
          <Link href="/jela" className={navLink}>
            {t('dishes')}
          </Link>
          <Link href="/kuhinje" className={navLink}>
            {t('categories')}
          </Link>
          {/* Cities are the two launch markets; below `sm` they'd crowd the bar,
              and they're still reachable from the footer and the home filter. */}
          <Link href="/grad/ns" className={`${navLink} hidden sm:inline-block`}>
            {CITY_NAMES.ns}
          </Link>
          <Link href="/grad/bg" className={`${navLink} hidden sm:inline-block`}>
            {CITY_NAMES.bg}
          </Link>
        </nav>

        <div className="ml-auto shrink-0">
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
