'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { ROUTER } from '@/router';
import { TripCard } from '@/components/trip/trip-card';

type Props = {
  username: string;
  isOwnProfile?: boolean;
};

export const UserJourneys: React.FC<Props> = ({ username, isOwnProfile = false }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const tripQuery = useQuery({
    queryKey: [API_QUERY_KEYS.TRIPS, username, isOwnProfile],
    queryFn: async () => {
      const result = isOwnProfile 
        ? await apiClient.getTrips()
        : await apiClient.getTripsByUsername({ username });
      
      return result.data;
    },
    retry: 0,
  });

  const results = tripQuery.data?.results || 0;
  const trips = tripQuery.data?.data || [];

  const handleJourneyClick = (tripId: string) => {
    // Set transitioning state for better UX
    setIsTransitioning(true);
    
    // Find the clicked trip to check if it's private
    const clickedTrip = trips.find(trip => trip.id === tripId);
    
    // If it's a private journey and this is the owner's profile, go to edit view
    if (isOwnProfile && clickedTrip && !clickedTrip.public) {
      const url = ROUTER.JOURNEYS.DETAIL(tripId);
      router.push(url);
    } else {
      // For public journeys (or when viewing someone else's profile), use explore context
      // Clear ALL map query cache entries to prevent stale data when switching journeys
      queryClient.removeQueries({ 
        queryKey: [API_QUERY_KEYS.MAP.QUERY] 
      });
      
      const url = `${ROUTER.HOME}?context=journey&filter=post&journey_id=${tripId}&user=${username}`;
      router.push(url);
    }
    
    // Reset transitioning state after navigation
    setTimeout(() => setIsTransitioning(false), 1000);
  };

  if (tripQuery.isLoading || isTransitioning) {
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
            variant={trip.public === false ? "private" : "public"}
            onClick={trip.id && !isTransitioning ? () => handleJourneyClick(trip.id) : undefined}
            {...trip}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="text-center text-gray-500 py-8">
      <p>No journeys found</p>
    </div>
  );
};