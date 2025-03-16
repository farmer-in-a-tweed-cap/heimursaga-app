'use client';

import { useQuery } from '@tanstack/react-query';

import { getUserPostsQuery } from '@/lib/api';

import { PostCard } from '@/components';

type Props = {
  username?: string;
};

export const UserPostsFeed: React.FC<Props> = ({ username }) => {
  if (username) {
    const userPostsQuery = useQuery({
      queryKey: [getUserPostsQuery.queryKey, username],
      queryFn: () => getUserPostsQuery.queryFn({ username }),
    });

    const results = userPostsQuery.data?.results || 0;
    const posts = userPostsQuery.data?.data || [];

    return userPostsQuery.isLoading ? (
      <>loading..</>
    ) : userPostsQuery.isSuccess ? (
      results < 1 ? (
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
      )
    ) : (
      <>no posts</>
    );
  } else {
    return <>no posts</>;
  }
};
