'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { getUserBookmarks } from '@/lib/api';

import { PostCard } from '@/components';

type Props = {};

export const UserBookmarks: React.FC<Props> = () => {
  const bookmarksQuery = useQuery({
    queryKey: [getUserBookmarks.queryKey],
    queryFn: () => getUserBookmarks.queryFn(),
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
          coordinates={{
            lat: post.lat,
            lon: post.lon,
          }}
        />
      ))}
    </div>
  ) : (
    <span>No bookmarks yet.</span>
  );
};
