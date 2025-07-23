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
      // Get all posts and filter for this user's public posts
      // This includes posts with waypoints attached (which should be all posts)
      console.log(`Getting all posts for user: ${username}`);
      const allPostsResult = await apiClient.getPosts();
      
      const userPosts = allPostsResult.data?.data?.filter(post => 
        post.author?.username === username && 
        post.public === true &&
        !post.deleted_at
      ) || [];
      
      // Sort by creation date descending (newest first)
      const sortedPosts = userPosts.sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
      
      console.log(`Found ${sortedPosts.length} public posts for ${username}`);
      
      return {
        results: sortedPosts.length,
        data: sortedPosts
      };
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
      {posts.map(({ author, ...post }, key) => (
        <PostCard
          key={key}
          {...post}
          href={post.id ? ROUTER.ENTRIES.DETAIL(post.id) : '#'}
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
          waypoint={post?.waypoint}
          actions={{
            like: true,
            bookmark: me ? false : true,
            edit: true,
          }}
        />
      ))}
    </div>
  ) : (
    <>no entries</>
  );
};
