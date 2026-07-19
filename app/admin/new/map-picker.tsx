'use client';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {Map as MlMap, Marker} from 'maplibre-gl';
import {useEffect, useRef, useState} from 'react';

export type Coords = {lat: number; lng: number};

// ponytail: the MapTiler style URL is the ONE provider-specific line — this
// component IS the "provajder zamenljiv" adapter the blueprint asks for; swap it
// here to change map providers. Public map key (NEXT_PUBLIC_), restrict by domain
// in the MapTiler dashboard.
const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;
const STYLE = `https://api.maptiler.com/maps/streets-v2/style.json?key=${KEY}`;

const CITY_CENTER = {
  ns: {lng: 19.8335, lat: 45.2671},
  bg: {lng: 20.4573, lat: 44.7866},
} as const;

const inputCls =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export default function MapPicker(props: {
  value: Coords | null;
  onChange: (c: Coords) => void;
  city: 'ns' | 'bg';
}) {
  // No key (fresh checkout / CI): fall back to plain numeric inputs so the form
  // still works. Never OSM tiles in prod (blueprint §"OSM se NE koristi").
  if (!KEY) return <ManualCoords {...props} />;
  return <MapView {...props} />;
}

function MapView({
  value,
  onChange,
  city,
}: {
  value: Coords | null;
  onChange: (c: Coords) => void;
  city: 'ns' | 'bg';
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const [coords, setCoords] = useState<Coords | null>(value);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !container.current || map.current) return;

      const start = value ?? CITY_CENTER[city];
      const m = new maplibregl.Map({
        container: container.current,
        style: STYLE,
        center: [start.lng, start.lat],
        zoom: value ? 15 : 12,
      });
      map.current = m;
      m.addControl(new maplibregl.NavigationControl(), 'top-right');

      const place = (lng: number, lat: number) => {
        if (!marker.current) {
          marker.current = new maplibregl.Marker({draggable: true})
            .setLngLat([lng, lat])
            .addTo(m);
          marker.current.on('dragend', () => {
            const p = marker.current!.getLngLat();
            setCoords(p);
            onChangeRef.current(p);
          });
        } else {
          marker.current.setLngLat([lng, lat]);
        }
        setCoords({lat, lng});
        onChangeRef.current({lat, lng});
      };

      // Edit mode: show the saved pin immediately (value already in form state,
      // so no onChange needed on init — place the marker without emitting).
      if (value) {
        marker.current = new maplibregl.Marker({draggable: true})
          .setLngLat([value.lng, value.lat])
          .addTo(m);
        marker.current.on('dragend', () => {
          const p = marker.current!.getLngLat();
          setCoords(p);
          onChangeRef.current(p);
        });
      }

      m.on('click', (e) => place(e.lngLat.lng, e.lngLat.lat));
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // Init once; live updates go through refs / the click handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the city changes and nothing's been placed yet.
  useEffect(() => {
    if (!coords) map.current?.flyTo({center: [CITY_CENTER[city].lng, CITY_CENTER[city].lat]});
  }, [city, coords]);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Lokacija na mapi * (klikni da postaviš pin, prevuci da doteraš)
      </span>
      <div
        ref={container}
        className="h-72 w-full overflow-hidden rounded border border-zinc-300 dark:border-zinc-700"
      />
      <span className="text-xs text-zinc-500">
        {coords
          ? `lat ${coords.lat.toFixed(5)} · lng ${coords.lng.toFixed(5)}`
          : 'Nijedna tačka još nije izabrana.'}
      </span>
    </div>
  );
}

function ManualCoords({
  value,
  onChange,
}: {
  value: Coords | null;
  onChange: (c: Coords) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Lat *
          </span>
          <input
            className={inputCls}
            type="number"
            step="any"
            value={value?.lat ?? ''}
            onChange={(e) =>
              onChange({lat: Number(e.target.value), lng: value?.lng ?? 0})
            }
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Lng *
          </span>
          <input
            className={inputCls}
            type="number"
            step="any"
            value={value?.lng ?? ''}
            onChange={(e) =>
              onChange({lat: value?.lat ?? 0, lng: Number(e.target.value)})
            }
          />
        </label>
      </div>
      <span className="text-xs text-zinc-500">
        Mapa nije dostupna (nedostaje NEXT_PUBLIC_MAPTILER_KEY). Desni klik u
        Google Maps kopira „lat, lng“ u decimalnim stepenima.
      </span>
    </div>
  );
}
