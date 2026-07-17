import {hasLocale} from 'next-intl';
import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

/**
 * Per-request i18n configuration. next-intl calls this on the server for
 * every request; the plugin in `next.config.ts` points here.
 *
 * We load the whole message file for the active locale. Because layouts and
 * pages are Server Components by default, these JSON files never reach the
 * client bundle unless a Client Component actually asks for a string.
 */
export default getRequestConfig(async ({requestLocale}) => {
  // `requestLocale` is the value of the [locale] segment matched by the proxy.
  const requested = await requestLocale;

  // Fall back to the default if the segment is missing or unsupported
  // (the [locale] segment acts like a catch-all, so this must be guarded).
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
