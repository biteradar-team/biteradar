'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useEffect, useState} from 'react';
import {Link, usePathname} from '@/src/i18n/navigation';
import {MoonIcon, SunIcon} from './icons';

const control =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-line-strong px-2.5 text-sm text-ink-muted transition-colors hover:bg-raised hover:text-ink';

/**
 * The two controls on the right of the header: language and theme.
 *
 * Client component because the theme toggle needs an onClick — but note it holds
 * NO React state. See the comment on `toggleTheme`.
 */
export default function HeaderActions() {
  const t = useTranslations('Nav');
  const locale = useLocale();
  // next-intl's usePathname returns the path WITHOUT the locale prefix
  // (`/jelo/burek`, never `/en/jelo/burek`), which is exactly what <Link locale>
  // wants — it re-applies the prefix itself.
  const pathname = usePathname();
  const other = locale === 'sr' ? 'en' : 'sr';

  /*
    Carry the current filters across a language switch.

    We can't use useSearchParams(): it forces a Suspense boundary, and this
    header renders inside the statically-prerendered /jela and /kuhinje pages,
    so it would break their build. Instead we read the live URL just before the
    link can possibly be activated — you have to point at or focus a link to
    click it, and both events fire first. Reading it during render wouldn't work,
    because instant filtering changes the query without re-rendering the layout.
  */
  const [query, setQuery] = useState<Record<string, string>>({});
  const syncQuery = () =>
    setQuery(Object.fromEntries(new URLSearchParams(window.location.search)));

  /*
    Stateless on purpose: the current theme already lives in the DOM as
    `data-theme` (the inline script in <head> puts it there before first paint),
    so we read it from there rather than mirroring it in React. The icon and
    label swap via CSS, not re-render — see .theme-dark-only in globals.css.
  */
  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // Private mode / storage disabled — the toggle still works for this page.
    }
  }

  /*
    Re-assert the saved theme after a locale switch. Switching language
    re-renders the root layout (new <html lang>), and the server markup carries
    no data-theme — suppressHydrationWarning only covers the FIRST hydration, so
    on this later re-render React drops the attribute back to the dark default.
    The inline <head> script only runs on a full load, not this soft nav, so we
    restore it here. Keyed on locale; a no-op when the theme is already right.
  */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      document.documentElement.dataset.theme =
        saved === 'light' ? 'light' : 'dark';
    } catch {
      // Storage disabled — leave whatever the inline script set.
    }
  }, [locale]);

  return (
    <div className="flex items-center gap-2">
      <Link
        // Object form, not `pathname + search`: a query string embedded in the
        // href string gets dropped on the way through next-intl's locale
        // prefixing, silently losing the filters.
        href={{pathname, query}}
        locale={other}
        onPointerEnter={syncQuery}
        onFocus={syncQuery}
        className={`${control} font-expanded text-xs uppercase`}
        // The label names the destination language, not the current one.
        aria-label={t('switchLanguage')}
      >
        {other}
      </Link>

      <button type="button" onClick={toggleTheme} className={control}>
        <SunIcon className="theme-dark-only size-4" />
        <MoonIcon className="theme-light-only size-4" />
        {/* The visible content is an icon, so the accessible name comes from
            these. Only one is in the layout at a time, matching the icon. */}
        <span className="theme-dark-only sr-only">{t('themeToLight')}</span>
        <span className="theme-light-only sr-only">{t('themeToDark')}</span>
      </button>
    </div>
  );
}
