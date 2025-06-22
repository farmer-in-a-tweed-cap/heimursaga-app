'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { PostCard } from '@/components';

type Props = {};

export const UserBookmarks: React.FC<Props> = () => {
  const bookmarksQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USER.BOOKMARKS],
    queryFn: () => apiClient.getUserBookmarks().then(({ data }) => data),
    retry: 0,
    staleTime: 5000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const loading = bookmarksQuery.isLoading;
  const results = bookmarksQuery.data?.results || 0;
  const bookmarks = bookmarksQuery.data?.data || [];

  return loading ? (
    <LoadingSpinner />
  ) : results ? (
    <div className="w-full flex flex-col gap-3">
      {bookmarks.map(({ author, ...post }, key) => (
        <PostCard
          key={key}
          {...post}
          author={{
            name: author?.name,
            username: author?.username,
            picture: author?.picture,
          }}
          waypoint={post?.waypoint}
        />
      ))}
    </div>
  ) : (
    <span>No bookmarks yet.</span>
  );
};
