'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

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
    queryKey: [API_QUERY_KEYS.USER_FEED, username],
    queryFn: async () => {
      if (me) {
        // If viewing own profile, use getUserPosts to get all posts (public + private)
        return apiClient.getUserPosts().then(({ data }) => data);
      } else {
        // If viewing someone else's profile, get all posts and filter for this user's public posts
        const allPostsResult = await apiClient.getPosts();
        
        const userPosts = allPostsResult.data?.data?.filter(post => 
          post.author?.username === username && 
          post.public === true &&
          !post.isDraft
        ) || [];
        
        // Sort by creation date descending (newest first)
        const sortedPosts = userPosts.sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        
        return {
          results: sortedPosts.length,
          data: sortedPosts
        };
      }
    },
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
      {posts.map(({ author, waypoint, ...post }, key) => (
        <PostCard
          key={key}
          {...post}
          date={post.date}
          href={post.id ? ROUTER.ENTRIES.DETAIL(post.id) : '#'}
          sponsored={post.sponsored}
          author={{
            name: author?.username,
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
          waypoint={waypoint}
          actions={{
            like: false,
            bookmark: false,
            edit: me,
            share: true,
            flag: !me,
          }}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-8 text-gray-500">
      {me ? "Share your stories" : "No public journal entries logged"}
    </div>
  );
};
