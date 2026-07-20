'use client';

/*
  Emits the anti-FOUC theme <script> ONLY during server rendering.

  On the server `window` is undefined, so the raw <script> lands in the initial
  HTML <head> and runs before first paint — no dark flash for light-mode users.

  On the client it returns null. That matters because switching language
  re-renders the [locale] layout on the client, and React 19 refuses to render
  a <script> element during a client render — it logs "Encountered a script tag
  while rendering React component" every time. Keeping the element out of client
  renders removes that error. The script has already run by then anyway, and the
  effect in header-actions re-asserts the saved theme across the soft nav.

  The server-only markup is dropped on the client during hydration; that's fine
  (the script already executed) and suppressHydrationWarning silences the notice.
*/
export default function ThemeScript({code}: {code: string}) {
  if (typeof window !== 'undefined') return null;
  return (
    <script suppressHydrationWarning dangerouslySetInnerHTML={{__html: code}} />
  );
}
