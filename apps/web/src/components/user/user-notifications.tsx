'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { getUserNotifications } from '@/lib/api';

import { UserNotificationCard } from './user-notification-card';

export const UserNotifications = () => {
  const notificationsQuery = useQuery({
    queryKey: [getUserNotifications.queryKey],
    queryFn: () => getUserNotifications.queryFn(),
    retry: 0,
  });

  const loading = notificationsQuery.isLoading;
  const results = notificationsQuery.data?.results || 0;
  const notifications = notificationsQuery.data?.data || [];

  return (
    <div className="flex flex-col gap-2">
      {loading ? (
        <LoadingSpinner />
      ) : (
        notifications.map(({ context, mentionUser, date, postId }, key) => (
          <UserNotificationCard
            key={key}
            context={context}
            mentionUser={mentionUser}
            postId={postId}
            date={date}
          />
        ))
      )}
    </div>
  );
};
