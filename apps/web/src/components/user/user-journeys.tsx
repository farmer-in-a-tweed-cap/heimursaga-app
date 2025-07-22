'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { ROUTER } from '@/router';
import { TripCard } from '@/components/trip/trip-card';

type Props = {
  username: string;
};

export const UserJourneys: React.FC<Props> = ({ username }) => {
  const tripQuery = useQuery({
    queryKey: [API_QUERY_KEYS.TRIPS, username],
    queryFn: async () =>
      apiClient
        .getTripsByUsername({ username })
        .then(({ data }) => data),
    retry: 0,
  });

  const results = tripQuery.data?.results || 0;
  const trips = tripQuery.data?.data || [];

  if (tripQuery.isLoading) {
    return <LoadingSpinner />;
  }

  if (tripQuery.error) {
    return <div>Error loading journeys: {tripQuery.error.message}</div>;
  }

  if (results >= 1) {
    return (
      <div className="flex flex-col gap-2">
        {trips.map((trip, key) => (
          <TripCard
            key={key}
            variant="public"
            href={trip.id ? ROUTER.JOURNEYS.DETAIL(trip.id) : '#'}
            {...trip}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="text-center text-gray-500 py-8">
      <p>No journeys found for {username}</p>
      <p className="text-sm mt-2">
        Debug: Results={results}, Trips length={trips.length}
      </p>
    </div>
  );
};