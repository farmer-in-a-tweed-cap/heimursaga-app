'use client';

import { LoadingSpinner } from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { useSession } from '@/hooks';

import { UserNotificationCard } from './user-notification-card';

export const UserNotifications = () => {
  const session = useSession();
  
  const notificationsQuery = useQuery({
    queryKey: [API_QUERY_KEYS.USER.NOTIFICATIONS, session.username], // Use username instead of userId
    queryFn: () => apiClient.getUserNotifications().then(({ data }) => data),
    enabled: !!session.logged && !!session.username, // Wait for logged status and username
    retry: 3,
    staleTime: 60000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const loading = notificationsQuery.isLoading;
  const error = notificationsQuery.error;
  const results = notificationsQuery.data?.results || 0;
  const notifications = notificationsQuery.data?.data || [];

  // Notifications component ready

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
