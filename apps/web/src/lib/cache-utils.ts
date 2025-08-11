import { QueryClient } from '@tanstack/react-query';
import { API_QUERY_KEYS } from './api';

/**
 * Centralized cache invalidation utilities
 */
export class CacheInvalidator {
  constructor(private queryClient: QueryClient) {}

  /**
   * Invalidate all user-related data after profile updates
   */
  invalidateUserData(username?: string) {
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.GET_SESSION_USER] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.GET_SESSION] });
    
    if (username) {
      this.queryClient.invalidateQueries({ 
        queryKey: [API_QUERY_KEYS.USER.POSTS], 
        predicate: (query) => query.queryKey.includes(username)
      });
    }
  }

  /**
   * Invalidate all post-related data after creating/updating/deleting entries
   */
  invalidatePostData(postId?: string) {
    // Invalidate main feeds
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.POSTS] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.GET_POSTS] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER_FEED] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.GET_USER_POSTS] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.POSTS] });
    
    // Invalidate map data
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MAP.QUERY] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.QUERY_POST_MAP] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.MAP] });
    
    // Invalidate specific post if ID provided
    if (postId) {
      this.queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey.includes(postId)
      });
    }

    // Invalidate drafts and bookmarks
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER_DRAFTS] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER_BOOKMARKS] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.BOOKMARKS] });
  }

  /**
   * Invalidate trip/journey related data
   */
  invalidateTripData(tripId?: string) {
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.TRIPS] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MAP.QUERY] });
    
    if (tripId) {
      this.queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey.includes(tripId)
      });
    }
  }

  /**
   * Invalidate sponsorship related data
   */
  invalidateSponsorshipData() {
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.SPONSORSHIPS] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.BADGE_COUNT] });
  }

  /**
   * Invalidate notification data
   */
  invalidateNotificationData() {
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.NOTIFICATIONS] });
    this.queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.BADGE_COUNT] });
  }

  /**
   * Force refresh of all cached data (nuclear option)
   */
  invalidateAll() {
    this.queryClient.invalidateQueries();
    this.queryClient.clear();
  }
}

/**
 * Hook to get cache invalidation utilities
 */
export const useCacheInvalidator = (queryClient: QueryClient) => {
  return new CacheInvalidator(queryClient);
};