'use client';

import {useEffect, useRef, useTransition, type ReactNode} from 'react';
import {usePathname, useRouter} from '@/src/i18n/navigation';

/**
 * Instant, URL-driven filters — no "Pretraži" button (blueprint §10.5).
 *
 * `fields` (the inputs) and `children` (the results) are server-rendered slots.
 * This component never renders either itself; it only owns the <form>, the
 * debounce and the pending state. Three consequences worth knowing:
 *
 *  - one component covers every filtered page, because it has no idea which
 *    filters exist — home passes q + city + openNow, the dish and cuisine pages
 *    pass city only;
 *  - no translations and no DB code cross into the client bundle;
 *  - it can never accidentally import a `server-only` service.
 *
 * Filtering itself stays on the server. We navigate — we do NOT re-filter a
 * pre-fetched array in JS, which would silently lose the Postgres full-text
 * search, the pg_trgm typo tolerance, and everything past the query's row limit.
 *
 * With JS off, the plain GET <form> still submits to the current URL exactly as
 * it did before; the submit button in `fields` is revealed by the <noscript>
 * rule at the bottom.
 */
export default function Filters({
  fields,
  children,
  busyLabel,
  className = '',
  debounceMs = 300,
}: {
  fields: ReactNode;
  children: ReactNode;
  /** Announced to screen readers while results reload. Passed in so the
      messages don't have to ship to the client. */
  busyLabel: string;
  className?: string;
  debounceMs?: number;
}) {
  const router = useRouter();
  // next-intl's usePathname returns the path WITHOUT the locale prefix, which is
  // what its router.replace expects — it re-applies the prefix itself. Mixing in
  // next/navigation's usePathname here would produce `/en/en?q=…`.
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Don't navigate after the user has left the page.
  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      // Drop empties so "Svi gradovi" (value '') leaves a clean, shareable URL.
      if (typeof value === 'string' && value) params.set(key, value);
    }
    // Carry „Blizu mene" coordinates forward. They're set imperatively by the
    // geolocation button, not via a form field, so a plain FormData rebuild would
    // drop them on the next chip toggle. Read from the live URL (not stale DOM),
    // so clearing filters — which navigates to a coord-less URL — self-corrects.
    const current = new URLSearchParams(window.location.search);
    for (const key of ['lat', 'lng'] as const) {
      const val = current.get(key);
      if (val) params.set(key, val);
    }
    const qs = params.toString();
    startTransition(() => {
      // `replace`, not `push` — otherwise every keystroke becomes a history
      // entry and the Back button walks the user through each one.
      router.replace(qs ? `${pathname}?${qs}` : pathname, {scroll: false});
    });
  }

  return (
    <>
      {/*
        No `action` attribute on purpose. Without one the form submits to the
        current URL, which is what keeps the no-JS fallback working on /en;
        action={pathname} would drop an English visitor back onto the Serbian
        page.
      */}
      <form
        method="get"
        className={className}
        onChange={(e) => {
          // Capture the form now — React nulls currentTarget once the event
          // finishes dispatching, so the setTimeout below would see null.
          const form = e.currentTarget;
          const el = e.target;
          const isTyping =
            el instanceof HTMLInputElement &&
            (el.type === 'search' || el.type === 'text');
          clearTimeout(timer.current);
          if (isTyping) {
            timer.current = setTimeout(() => apply(form), debounceMs);
          } else {
            // Chips and checkboxes are deliberate single actions — apply at once.
            apply(form);
          }
        }}
        onSubmit={(e) => {
          // Pressing Enter should search immediately rather than wait out the
          // debounce.
          e.preventDefault();
          clearTimeout(timer.current);
          apply(e.currentTarget);
        }}
      >
        {fields}
        {/*
          Reveals the submit button only when scripting is off.
          dangerouslySetInnerHTML is required rather than a real <style> child:
          with JS enabled, browsers parse <noscript> contents as plain text, so
          JSX children would cause a hydration mismatch. The content is a fixed
          literal — nothing is interpolated into it.
        */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: '<style>[data-nojs]{display:inline-flex!important}</style>',
          }}
        />
      </form>

      <div
        aria-busy={isPending}
        className={`transition-opacity duration-200${isPending ? ' opacity-40' : ''}`}
      >
        {children}
      </div>

      <p aria-live="polite" className="sr-only">
        {isPending ? busyLabel : ''}
      </p>
    </>
  );
}
