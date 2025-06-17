'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { ROUTER } from '@/router';

import { TripCard } from './trip-card';

export const CreatorTrips = () => {
  const tripQuery = useQuery({
    queryKey: [QUERY_KEYS.TRIPS],
    queryFn: async () => apiClient.getTrips().then(({ data }) => data),
    retry: 0,
  });

  const results = tripQuery.data?.results || 0;
  const trips = tripQuery.data?.data || [];

  return (
    <div className="flex flex-col gap-2">
      {tripQuery.isLoading ? (
        <LoadingSpinner />
      ) : results >= 1 ? (
        trips.map((trip, key) => (
          <TripCard
            key={key}
            variant="private"
            href={trip.id ? ROUTER.JOURNEYS.DETAIL(trip.id) : '#'}
            {...trip}
          />
        ))
      ) : (
        <>no journeys</>
      )}
    </div>
  );
};
