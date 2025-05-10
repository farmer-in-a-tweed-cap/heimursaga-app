'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { getUserPostsQuery } from '@/lib/api';

import { PostCard } from '@/components';

type Props = {};

export const UserJournalPosts: React.FC<Props> = () => {
  const postsQuery = useQuery({
    queryKey: [getUserPostsQuery.queryKey],
    queryFn: () => getUserPostsQuery.queryFn(),
    retry: 0,
  });

  const loading = postsQuery.isLoading;
  const results = postsQuery.data?.results || 0;
  const posts = postsQuery.data?.data || [];

  return loading ? (
    <LoadingSpinner />
  ) : results < 1 ? (
    <>no posts</>
  ) : (
    <div className="w-full flex flex-col gap-2">
      {posts.map(({ author, ...post }, key) => (
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
  );
};
