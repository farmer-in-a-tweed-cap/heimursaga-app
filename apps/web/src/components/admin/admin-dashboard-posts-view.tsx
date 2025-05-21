'use client';

import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

import { AdminPostTable } from './admin-post-table';

export const AdminDashboardPostsView = () => {
  const session = useSession();

  const postQuery = useQuery({
    queryKey: [QUERY_KEYS.POSTS],
    queryFn: () => apiClient.getPosts().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const posts = postQuery.data?.data || [];

  return (
    <div className="flex flex-col">
      <AdminPostTable
        data={posts}
        refetch={() => postQuery.refetch()}
        loading={postQuery.isLoading}
      />
    </div>
  );
};
