import {getTranslations} from 'next-intl/server';
import Pill from './pill';

/**
 * „Provereno pre X dana" — the §3.1 trust differentiator. Renders nothing when
 * `verifiedAt` is null, so the site never claims a freshness it doesn't have.
 *
 * The relative phrase comes from `Intl.RelativeTimeFormat` (stdlib, locale-aware),
 * not a date library: it turns a day delta into "pre 3 dana" / "3 days ago" for
 * free, and the i18n key only wraps the verb around it.
 */
export default async function VerifiedBadge({
  verifiedAt,
  locale,
}: {
  verifiedAt: Date | null;
  locale: string;
}) {
  if (!verifiedAt) return null;
  const t = await getTranslations('Location');

  // Server component rendered per request, so "now" is the right, intended input —
  // the purity rule is aimed at client re-renders that don't apply here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  // Whole-day delta, floored, non-negative (a clock skew must not read "in 1 day").
  const days = Math.max(0, Math.floor((now - verifiedAt.getTime()) / 86_400_000));
  // The site's Serbian is Latin script; plain 'sr' would render Cyrillic
  // ("пре 3 дана"), so pin the script the rest of the UI uses.
  const intlLocale = locale === 'sr' ? 'sr-Latn' : locale;
  const ago = new Intl.RelativeTimeFormat(intlLocale, {numeric: 'auto'}).format(
    -days,
    'day',
  );

  return <Pill variant="neutral">{t('verified', {ago})}</Pill>;
}
