'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from 'use-debounce';
import { apiClient, API_QUERY_KEYS } from '@/lib/api';
import { IPostUpdatePayload } from '@repo/types';
import { useCacheRefresh } from './use-cache-refresh';

interface UseAutoSaveProps {
  postId?: string;
  data: IPostUpdatePayload & {
    lat?: number;
    lon?: number;
    waypointId?: number;
    tripId?: string;
    uploads?: string[];
  };
  delay?: number;
  enabled?: boolean;
  onDraftCreated?: (draftId: string) => void;
}

export const useAutoSave = ({
  postId,
  data,
  delay = 1500, // 1.5 seconds
  enabled = true,
  onDraftCreated,
}: UseAutoSaveProps) => {
  const [debouncedData] = useDebounce(data, delay);
  const lastSavedData = useRef<string>('');
  const queryClient = useQueryClient();
  const { refreshAfterPostUpdate } = useCacheRefresh();

  const updatePostMutation = useMutation({
    mutationFn: (payload: IPostUpdatePayload) =>
      apiClient.updatePost({ query: { id: postId! }, payload }),
    onSuccess: async () => {
      // Use centralized cache refresh for post updates
      await refreshAfterPostUpdate(postId);
    },
    onError: (error) => {
      console.error('Auto-save update failed:', error);
    },
  });

  const createPostMutation = useMutation({
    mutationFn: (payload: any) => apiClient.createPost(payload),
    onSuccess: async (response) => {
      const newPostId = response?.data?.id;
      if (newPostId && onDraftCreated) {
        onDraftCreated(newPostId);
      }
      // Use centralized cache refresh for post creation
      await refreshAfterPostUpdate(newPostId);
    },
    onError: (error) => {
      console.error('Auto-save create failed:', error);
    },
  });

  const save = useCallback(
    (saveData: IPostUpdatePayload & { lat?: number; lon?: number; waypointId?: number; tripId?: string; uploads?: string[] }) => {
      if (!enabled) {
        return;
      }

      // Create a serializable version of the data for comparison
      const dataForComparison = {
        ...saveData,
        date: saveData.date?.toISOString?.() || saveData.date,
      };
      const dataString = JSON.stringify(dataForComparison);
      
      // Only save if data has actually changed
      if (dataString === lastSavedData.current) {
        return;
      }
      
      // Skip if completely empty (but be very lenient for drafts)
      const hasTextContent = saveData.title?.trim() || saveData.content?.trim() || saveData.place?.trim();
      const hasUploads = saveData.uploads && saveData.uploads.length > 0;
      if (!hasTextContent && !hasUploads) {
        return;
      }
      lastSavedData.current = dataString;

      if (postId) {
        // Update existing post
        updatePostMutation.mutate({
          title: saveData.title,
          content: saveData.content,
          place: saveData.place,
          date: saveData.date,
          public: saveData.public,
          sponsored: saveData.sponsored,
          waypoint: saveData.lat !== undefined && saveData.lon !== undefined ? {
            lat: saveData.lat,
            lon: saveData.lon,
          } : undefined,
          tripId: saveData.tripId,
          uploads: saveData.uploads,
          isDraft: saveData.isDraft !== undefined ? saveData.isDraft : true, // Preserve existing draft status or default to draft
        });
      } else {
        // Create new draft post
        createPostMutation.mutate({
          title: saveData.title || '',
          content: saveData.content || ' ', // API requires content
          place: saveData.place || '',
          date: saveData.date || new Date(),
          lat: saveData.lat || 0, // Default coordinates for drafts
          lon: saveData.lon || 0,
          public: saveData.public || false,
          sponsored: saveData.sponsored || false,
          waypointId: saveData.waypointId,
          tripId: saveData.tripId,
          uploads: saveData.uploads,
          isDraft: saveData.isDraft !== undefined ? saveData.isDraft : true, // Default to draft for new posts
        });
      }
    },
    [postId, enabled, updatePostMutation, createPostMutation, onDraftCreated, queryClient]
  );

  // Auto-save when debounced data changes
  useEffect(() => {
    if (debouncedData) {
      save(debouncedData);
    }
  }, [debouncedData, save]);

  return {
    save,
    isAutoSaving: updatePostMutation.isPending || createPostMutation.isPending,
    lastSaveError: updatePostMutation.error || createPostMutation.error,
    isAutoSaveEnabled: enabled,
  };
};