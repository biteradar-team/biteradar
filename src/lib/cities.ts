/**
 * The two launch cities (blueprint §3 — Novi Sad + Beograd only pre-launch).
 * Single source of truth for the `city` enum's display names, so the public
 * profile, admin list, and home city picker all agree. Names stay Serbian
 * (the data is Serbian, §9) regardless of UI locale.
 */
export const CITY_NAMES: Record<'ns' | 'bg', string> = {
  ns: 'Novi Sad',
  bg: 'Beograd',
};

export type City = keyof typeof CITY_NAMES;

/** Narrow an untrusted query-string value to a valid city, or undefined. */
export function parseCity(value: unknown): City | undefined {
  return value === 'ns' || value === 'bg' ? value : undefined;
}
