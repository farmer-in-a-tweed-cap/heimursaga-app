'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { useSession } from '@/hooks';

import { UserNotificationCard } from './user-notification-card';

const UserNotificationsContent = () => {
  const session = useSession();
  const queryClient = useQueryClient();
  
  const notificationsQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USER.NOTIFICATIONS, session.username],
    queryFn: () => apiClient.getUserNotifications().then(({ data }) => data),
    enabled: !!session.logged && !!session.username,
    retry: 3,
    staleTime: 60000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Mutation to mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: () => apiClient.markNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.BADGE_COUNT] });
    },
  });

  // Mark notifications as read when notifications are successfully loaded
  useEffect(() => {
    if (notificationsQuery.isSuccess && notificationsQuery.data && session.logged) {
      const hasUnreadNotifications = notificationsQuery.data.data?.some(notification => !notification.read);
      if (hasUnreadNotifications && !markAsReadMutation.isPending) {
        markAsReadMutation.mutate();
      }
    }
  }, [notificationsQuery.isSuccess, notificationsQuery.data, session.logged, markAsReadMutation]);

  const loading = notificationsQuery.isLoading;
  const error = notificationsQuery.error;
  const results = notificationsQuery.data?.results || 0;
  const notifications = notificationsQuery.data?.data || [];

  return (
    <div className="flex flex-col gap-2">
      {loading || !session.logged ? (
        <LoadingSpinner />
      ) : error ? (
        <span>Error loading notifications: {error.message}</span>
      ) : results ? (
        notifications.map(
          ({ context, read, mentionUser, date, postId, body, sponsorshipType, sponsorshipAmount, sponsorshipCurrency }, key) => (
            <UserNotificationCard
              key={key}
              context={context}
              mentionUser={mentionUser}
              read={read}
              postId={postId}
              date={date}
              body={body}
              sponsorshipType={sponsorshipType}
              sponsorshipAmount={sponsorshipAmount}
              sponsorshipCurrency={sponsorshipCurrency}
            />
          ),
        )
      ) : (
        <span>no notifications yet.</span>
      )}
    </div>
  );
};

// Export as dynamic component with no SSR to prevent hydration issues
export const UserNotifications = dynamic(() => Promise.resolve(UserNotificationsContent), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});
