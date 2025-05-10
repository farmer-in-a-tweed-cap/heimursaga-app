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
        trips.map(({ id, title, waypointsCount }, key) => (
          <TripCard
            key={key}
            id={id}
            href={id ? ROUTER.TRIPS.DETAIL(id) : '#'}
            title={title}
            waypointsCount={waypointsCount}
          />
        ))
      ) : (
        <>no trips</>
      )}
    </div>
  );
};
