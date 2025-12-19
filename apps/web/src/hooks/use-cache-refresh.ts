'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCacheInvalidator } from '@/lib/cache-utils';

/**
 * Hook for managing cache refresh after mutations
 */
export const useCacheRefresh = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const cacheInvalidator = useCacheInvalidator(queryClient);

  const refreshAfterProfileUpdate = async (username?: string) => {
    // Invalidate queries
    cacheInvalidator.invalidateUserData(username);
    
    // Force Next.js to refresh the current route
    router.refresh();
  };

  const refreshAfterPostUpdate = async (postId?: string) => {
    // Invalidate queries  
    cacheInvalidator.invalidatePostData(postId);
    
    // Force Next.js to refresh the current route
    router.refresh();
  };

  const refreshAfterTripUpdate = async (tripId?: string) => {
    // Invalidate queries
    cacheInvalidator.invalidateTripData(tripId);
    
    // Force Next.js to refresh the current route
    router.refresh();
  };

  const refreshAfterSponsorshipUpdate = async () => {
    // Invalidate queries
    cacheInvalidator.invalidateSponsorshipData();
    
    // Force Next.js to refresh the current route
    router.refresh();
  };

  const refreshAll = async () => {
    // Nuclear option - clear everything and refresh
    cacheInvalidator.invalidateAll();
    router.refresh();
  };

  return {
    refreshAfterProfileUpdate,
    refreshAfterPostUpdate,
    refreshAfterTripUpdate,
    refreshAfterSponsorshipUpdate,
    refreshAll,
    cacheInvalidator,
  };
};