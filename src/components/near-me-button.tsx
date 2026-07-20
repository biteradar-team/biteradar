'use client';

import {useState} from 'react';
import {usePathname, useRouter} from '@/src/i18n/navigation';
import {PinIcon} from './icons';

/**
 * „Blizu mene" (§3.1 — „trenutna lokacija"). Inherently JS-only (geolocation +
 * imperative), so unlike the peer-checked filter chips it's a real button rather
 * than a no-JS form control — with scripting off it simply isn't rendered by
 * anyone who'd click it (the page still lists everything).
 *
 * It writes `lat`/`lng` straight to the URL; the home page reads them back to
 * distance-sort the list and center the map. `Filters.apply` carries the coords
 * across other filter changes, so this button never has to touch the form.
 */
export default function NearMeButton({
  label,
  errorLabel,
  active,
}: {
  label: string;
  errorLabel: string;
  active: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  function navigate(params: URLSearchParams) {
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false});
  }

  function onClick() {
    setError(false);
    const params = new URLSearchParams(window.location.search);

    // Already on → toggle off (drop the distance sort).
    if (active) {
      params.delete('lat');
      params.delete('lng');
      navigate(params);
      return;
    }

    if (!('geolocation' in navigator)) {
      setError(true);
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        params.set('lat', pos.coords.latitude.toFixed(6));
        params.set('lng', pos.coords.longitude.toFixed(6));
        navigate(params);
      },
      () => {
        setBusy(false);
        setError(true);
      },
      {enableHighAccuracy: false, timeout: 10000},
    );
  }

  const chip = active
    ? 'border-paprika bg-paprika font-medium text-white'
    : 'border-line-strong text-ink-muted hover:border-ink-muted hover:text-ink';

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-pressed={active}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 ${chip}`}
      >
        <PinIcon className="size-3.5" />
        {label}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-warn">
          {errorLabel}
        </span>
      ) : null}
    </div>
  );
}
