'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { UserNotificationCard } from './user-notification-card';

export const UserNotifications = () => {
  const notificationsQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USER.NOTIFICATIONS],
    queryFn: () => apiClient.getUserNotifications().then(({ data }) => data),
    retry: 0,
    staleTime: 5000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const loading = notificationsQuery.isLoading;
  const results = notificationsQuery.data?.results || 0;
  const notifications = notificationsQuery.data?.data || [];

  return (
    <div className="flex flex-col gap-2">
      {loading ? (
        <LoadingSpinner />
      ) : results ? (
        notifications.map(({ context, mentionUser, date, postId }, key) => (
          <UserNotificationCard
            key={key}
            context={context}
            mentionUser={mentionUser}
            postId={postId}
            date={date}
          />
        ))
      ) : (
        <span>No notifications yet.</span>
      )}
    </div>
  );
};
