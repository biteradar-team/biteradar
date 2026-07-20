'use client';

import {track} from '@vercel/analytics';
import {useEffect} from 'react';

/**
 * Fires the §3.1 search analytics events. Renders nothing.
 *
 * Takes `q` + `count` as PROPS (both known server-side on the home page) rather
 * than reading `useSearchParams()` — that would force a Suspense boundary and
 * break the statically-prerendered pages that share this tree.
 *
 * `zero_result` is the launch metric §13.9 cares about: what people searched
 * for and we had nothing for.
 */
export default function SearchTracker({q, count}: {q: string; count: number}) {
  useEffect(() => {
    if (!q) return;
    track('search', {q});
    if (count === 0) track('zero_result', {q});
  }, [q, count]);

  return null;
}
