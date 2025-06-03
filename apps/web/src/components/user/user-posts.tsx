'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { PostCard } from '@/components';
import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

type Props = {
  username: string;
};

export const UserPosts: React.FC<Props> = ({ username }) => {
  const session = useSession();
  const me = session.me(username);

  const postsQuery = useQuery({
    queryKey: [QUERY_KEYS.USER_FEED, username],
    queryFn: () =>
      apiClient.getUserPostsByUsername({ username }).then(({ data }) => data),
    retry: 0,
    enabled: !!username,
  });

  const loading = postsQuery.isLoading;
  const results = postsQuery.data?.results || 0;
  const posts = postsQuery.data?.data || [];

  return loading ? (
    <LoadingSpinner />
  ) : results >= 1 ? (
    <div className="w-full flex flex-col gap-3">
      {posts.map(({ author, ...post }, key) => (
        <PostCard
          key={key}
          {...post}
          href={post.id ? ROUTER.POSTS.DETAIL(post.id) : '#'}
          author={{
            name: author?.name,
            username: author?.username,
            picture: author?.picture,
            creator: author?.creator,
          }}
          userbar={
            author?.username
              ? {
                  href: ROUTER.USERS.DETAIL(author.username),
                }
              : undefined
          }
          coordinates={{
            lat: post.lat,
            lon: post.lon,
          }}
          actions={{
            like: true,
            bookmark: me ? false : true,
            edit: true,
          }}
        />
      ))}
    </div>
  ) : (
    <>no posts</>
  );
};
