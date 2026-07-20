'use client';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {Map as MlMap, Marker} from 'maplibre-gl';
import {useEffect, useRef, useState} from 'react';
import {CITY_CENTER, MAPTILER_KEY, MAPTILER_STYLE_URL} from '@/src/lib/maptiler';

/** The minimal shape a pin needs — both the home summary and the profile map to it. */
export type MapPin = {slug: string; name: string; lat: number; lng: number};

// maplibre-gl ships only a default export (its classes hang off `.default`), and
// its namespace type has no `default` member — so the runtime module is loaded
// this way and its type is derived from the value, not a `typeof import().default`
// query (which doesn't type-check).
const importGl = () => import('maplibre-gl').then((m) => m.default);
type Gl = Awaited<ReturnType<typeof importGl>>;

const PIN_COLOR = '#d93b21'; // paprika (brand) — the „radar pin"
const YOU_COLOR = '#2f7d4f'; // green, reserved for positive/self states

// Locale-prefixed profile href — matches next-intl `localePrefix: 'as-needed'`
// (sr has no prefix, en is /en/…). Built by hand because maplibre popups are raw
// DOM, outside next-intl's <Link>. A full navigation from the popup is fine.
function hrefFor(slug: string, locale: string) {
  return `${locale === 'sr' ? '' : `/${locale}`}/lokal/${slug}`;
}

/**
 * The public map. Reads its pins from the SAME server-filtered list the results
 * grid renders, so the two can never disagree (no separate viewport API — see
 * blueprint §10 deferral). Hidden entirely when no MapTiler key is configured;
 * the list keeps working. Never falls back to raw OSM tiles (§"OSM se NE koristi").
 *
 * The caller MUST give it a height via `className` (e.g. `h-72 sm:h-96`).
 */
export default function LocationsMap(props: {
  pins: MapPin[];
  userLoc?: {lat: number; lng: number};
  locale: string;
  className?: string;
}) {
  if (!MAPTILER_KEY) return null;
  return <MapView {...props} />;
}

function MapView({
  pins,
  userLoc,
  locale,
  className = '',
}: {
  pins: MapPin[];
  userLoc?: {lat: number; lng: number};
  locale: string;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const gl = useRef<Gl | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);

  // Init once; live updates go through the draw effect below.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = await importGl();
      if (cancelled || !container.current || map.current) return;
      gl.current = maplibregl;
      map.current = new maplibregl.Map({
        container: container.current,
        style: MAPTILER_STYLE_URL,
        center: [CITY_CENTER.ns.lng, CITY_CENTER.ns.lat],
        zoom: 11,
      });
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      gl.current = null;
      markers.current = [];
    };
  }, []);

  // Redraw markers + refit whenever the pins or the user's position change. The
  // map instance persists across the soft router.replace that filtering does, so
  // this just re-runs — the map is never re-initialised, keeping it in lockstep
  // with the list.
  useEffect(() => {
    const m = map.current;
    const maplibregl = gl.current;
    if (!ready || !m || !maplibregl) return;

    for (const marker of markers.current) marker.remove();
    markers.current = [];

    for (const pin of pins) {
      // Popup link built as a DOM node (textContent, not setHTML) so a name can
      // never inject markup.
      const a = document.createElement('a');
      a.href = hrefFor(pin.slug, locale);
      a.textContent = pin.name;
      a.className = 'text-sm font-medium text-paprika underline';
      const popup = new maplibregl.Popup({offset: 22, closeButton: false}).setDOMContent(a);
      markers.current.push(
        new maplibregl.Marker({color: PIN_COLOR})
          .setLngLat([pin.lng, pin.lat])
          .setPopup(popup)
          .addTo(m),
      );
    }
    if (userLoc) {
      markers.current.push(
        new maplibregl.Marker({color: YOU_COLOR})
          .setLngLat([userLoc.lng, userLoc.lat])
          .addTo(m),
      );
    }

    // Frame the pins (+ the user). fitBounds for many, a fixed zoom for one, the
    // NS center as a last resort so an empty result still shows a sane map.
    const pts: [number, number][] = pins.map((p) => [p.lng, p.lat]);
    if (userLoc) pts.push([userLoc.lng, userLoc.lat]);
    if (pts.length === 0) {
      m.jumpTo({center: [CITY_CENTER.ns.lng, CITY_CENTER.ns.lat], zoom: 11});
    } else if (pts.length === 1) {
      m.easeTo({center: pts[0], zoom: 14, duration: 300});
    } else {
      const b = new maplibregl.LngLatBounds(pts[0], pts[0]);
      for (const p of pts) b.extend(p);
      m.fitBounds(b, {padding: 48, maxZoom: 15, duration: 300});
    }
  }, [ready, pins, userLoc, locale]);

  return (
    <div
      ref={container}
      className={`overflow-hidden rounded-xl border border-line ${className}`}
    />
  );
}
