/**
 * MapTiler adapter (blueprint §"Mapa" — MapLibre + MapTiler, USVOJENO). The ONE
 * provider-specific place: swap the style URL to change providers. Shared by the
 * admin coordinate picker and the public map so they can't drift apart.
 *
 * Plain module (no `server-only`): the key is `NEXT_PUBLIC_`, so this is safe to
 * import from client components — same role `lib/cities.ts` plays.
 */
export const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

/** City map centers (lng, lat), for the initial view before any pin is placed. */
export const CITY_CENTER = {
  ns: {lng: 19.8335, lat: 45.2671},
  bg: {lng: 20.4573, lat: 44.7866},
} as const;

/**
 * Narrow the untrusted `?lat&lng` query values to a usable coordinate, or
 * undefined. The trust boundary for „Blizu mene": the numbers flow into a SQL
 * distance sort, so reject anything non-finite or off the globe before use.
 */
export function parseCoords(
  lat: unknown,
  lng: unknown,
): {lat: number; lng: number} | undefined {
  const latN = Number(lat);
  const lngN = Number(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return undefined;
  if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) return undefined;
  return {lat: latN, lng: lngN};
}
