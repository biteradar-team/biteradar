import type {ReactNode} from 'react';
import type {PublicLocationSummary} from '@/src/services/locations';
import LocationCard from './location-card';
import {EmptyState} from './shell';

/**
 * The card grid + its empty state, which home / city / cuisine each had their
 * own copy of.
 */
export default function ResultsGrid({
  locations,
  empty,
}: {
  locations: PublicLocationSummary[];
  empty: ReactNode;
}) {
  if (locations.length === 0) return <EmptyState>{empty}</EmptyState>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {locations.map((loc) => (
        <LocationCard key={loc.slug} loc={loc} />
      ))}
    </div>
  );
}
