/**
 * Price bands — the „cenovni rang" filter from blueprint §3.1.
 *
 * A location's band comes from the AVERAGE of its menu's current prices, bucketed
 * by the thresholds below. Lives in `lib/` rather than in the service because the
 * filter chips and the result card both render band labels, and the service is
 * `server-only`.
 *
 * ponytail: flat RSD guesses, one scale for both cities, average (not median) so
 * it stays a single SQL aggregate. Revisit once real menus are entered — split
 * per city if NS and BG diverge enough to matter.
 */
export const PRICE_BAND_MAX = [500, 1200] as const;

export type PriceBand = 1 | 2 | 3;

export const PRICE_BANDS: readonly PriceBand[] = [1, 2, 3];

/** Narrow an untrusted query-string value to a valid band, or undefined. */
export function parsePriceBand(value: unknown): PriceBand | undefined {
  return value === '1' || value === '2' || value === '3'
    ? (Number(value) as PriceBand)
    : undefined;
}

/**
 * The i18n key + values for a band's label, so the filter chip and the result
 * card render identical wording and the thresholds are quoted from the constant
 * above rather than hard-coded into the messages.
 *
 * Returns the key instead of the translated string so this file stays free of
 * next-intl (and therefore usable from anywhere).
 */
export function priceBandLabel(band: PriceBand): {
  key: 'priceUnder' | 'priceBetween' | 'priceOver';
  // Widened deliberately: without it TypeScript unions the three shapes and
  // infers `min?: undefined`, which next-intl's values param rejects.
  values: Record<string, number>;
} {
  if (band === 1) return {key: 'priceUnder', values: {max: PRICE_BAND_MAX[0]}};
  if (band === 2) {
    return {
      key: 'priceBetween',
      values: {min: PRICE_BAND_MAX[0], max: PRICE_BAND_MAX[1]},
    };
  }
  return {key: 'priceOver', values: {min: PRICE_BAND_MAX[1]}};
}
