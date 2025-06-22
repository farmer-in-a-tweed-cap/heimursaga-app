'use client';

import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { AdminUserTable } from './admin-user-table';

export const AdminDashboardUsersView = () => {
  const userQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USERS],
    queryFn: () => apiClient.getUsers().then(({ data }) => data),
    retry: 0,
  });

  const users = userQuery.data?.data || [];

  return (
    <div className="flex flex-col">
      <AdminUserTable
        data={users}
        refetch={() => userQuery.refetch()}
        loading={userQuery.isLoading}
      />
    </div>
  );
};
