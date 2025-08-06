'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { PostCard } from '@/components';

type Props = {};

export const UserBookmarks: React.FC<Props> = () => {
  const router = useRouter();
  
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

  const handlePostClick = (postId: string) => {
    router.push(`/entries/${postId}`);
  };

  return loading ? (
    <LoadingSpinner />
  ) : bookmarks.length > 0 ? (
    <div className="w-full flex flex-col gap-3">
      {bookmarks.map(({ author, waypoint, ...post }, key) => (
        <PostCard
          key={key}
          {...post}
          date={post.date}
          sponsored={post.sponsored}
          author={{
            name: author?.username,
            username: author?.username,
            picture: author?.picture,
            creator: author?.creator,
          }}
          waypoint={waypoint}
          actions={{
            like: false,
            bookmark: false,
            edit: false,
            share: true,
          }}
          onClick={() => handlePostClick(post.id)}
        />
      ))}
    </div>
  ) : (
    <span>No bookmarks yet.</span>
  );
};
