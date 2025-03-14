'use client';

import { useQuery } from '@tanstack/react-query';

import { getUserPostsQuery } from '@/lib/api';

import { PostCard } from '@/components';

type Props = {
  username?: string;
};

export const UserPostFeed: React.FC<Props> = ({ username }) => {
  if (username) {
    const userPostsQuery = useQuery({
      queryKey: getUserPostsQuery.queryKey,
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
          {posts.map((post, key) => (
            <PostCard
              key={key}
              id={post.id}
              author={{
                name: post.author?.name,
                username: post.author?.username,
                picture: post.author?.picture,
              }}
              coordinates={{
                lat: post.lat,
                lon: post.lon,
              }}
              title={post.title}
              content={post.content}
              date={post.date}
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
