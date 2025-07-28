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
      console.log(`Fetching journeys for user: ${username}, isOwnProfile: ${isOwnProfile}`);
      const result = isOwnProfile 
        ? await apiClient.getTrips()
        : await apiClient.getTripsByUsername({ username });
      console.log('Journeys API response:', {
        success: result.success,
        message: result.message,
        tripCount: result.data?.data?.length,
        trips: result.data?.data
      });
      
      // Look for the specific "public journey" trip
      const publicJourney = result.data?.data?.find(trip => 
        trip.title?.toLowerCase().includes('public journey')
      );
      if (publicJourney) {
        console.log('Found "public journey" trip:', {
          id: publicJourney.id,
          title: publicJourney.title,
          public: publicJourney.public,
          waypointsCount: publicJourney.waypoints?.length,
          waypoints: publicJourney.waypoints?.map(wp => ({
            id: wp.id,
            title: wp.title,
            public: wp.public,
            lat: wp.lat,
            lon: wp.lon
          }))
        });
      } else {
        console.log('No "public journey" trip found in results');
      }
      
      // Also check if we can see the user's posts and their waypoint connections
      try {
        const postsResult = await apiClient.getPosts();
        const userPosts = postsResult.data?.data?.filter(post => 
          post.author?.username === username
        ) || [];
        console.log(`User has ${userPosts.length} posts with waypoint connections:`, 
          userPosts.map(post => ({
            id: post.id,
            title: post.title,
            waypoint_id: post.waypoint?.id,
            hasWaypoint: !!post.waypoint
          }))
        );
      } catch (e) {
        console.log('Could not fetch posts for waypoint analysis');
      }
      
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
            variant="public"
            onClick={trip.id && !isTransitioning ? () => handleJourneyClick(trip.id) : undefined}
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