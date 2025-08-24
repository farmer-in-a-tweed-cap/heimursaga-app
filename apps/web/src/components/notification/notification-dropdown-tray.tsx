'use client';

import { IUserNotification, UserNotificationContext, SponsorshipType } from '@repo/types';
import { Card, Badge } from '@repo/ui/components';
import { Bell } from '@repo/ui/icons';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useState } from 'react';

// Using a simple time ago function instead of date-fns to avoid dependency issues
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return 'just now';
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};

// Format notification text to match the full notifications page
const formatNotificationText = (notification: IUserNotification, entryTitle?: string): string => {
  const { context, mentionUser, body, sponsorshipType, sponsorshipAmount, sponsorshipCurrency } = notification;
  
  switch (context) {
    case UserNotificationContext.LIKE: {
      let likeText = `${mentionUser.username} highlighted your entry`;
      if (entryTitle) {
        likeText += `: "${entryTitle}"`;
      }
      return likeText;
    }
    case UserNotificationContext.FOLLOW:
      return `${mentionUser.username} followed you`;
    case UserNotificationContext.SPONSORSHIP: {
      let sponsorshipText = `${mentionUser.username} has sponsored you`;
      if (body) {
        sponsorshipText += `: "${body}"`;
      }
      
      // Add sponsorship type and amount information
      if (sponsorshipType && sponsorshipAmount) {
        const amount = (sponsorshipAmount / 100).toFixed(2); // Convert from cents to dollars
        const currency = sponsorshipCurrency || 'USD';
        
        if (sponsorshipType === SponsorshipType.SUBSCRIPTION) {
          sponsorshipText += ` (monthly subscription: $${amount} ${currency})`;
        } else if (sponsorshipType === SponsorshipType.ONE_TIME_PAYMENT) {
          sponsorshipText += ` (one-time payment: $${amount} ${currency})`;
        }
      }
      
      return sponsorshipText;
    }
    default:
      return `${mentionUser.username} ${context}`;
  }
};

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { UserAvatar } from '../user/user-avatar';
import { useNavigation } from '@/hooks';

type Props = {
  children: React.ReactNode;
  badgeCount: number;
  className?: string;
};

export const NotificationDropdownTray: React.FC<Props> = ({ 
  children, 
  badgeCount, 
  className = '' 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();
  const { navigateTo, isNavigating } = useNavigation();

  // Fetch notifications when hovering
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: [API_QUERY_KEYS.USER.NOTIFICATIONS],
    queryFn: () => apiClient.getUserNotifications().then(({ data }) => data),
    enabled: isHovered, // Only fetch when hovering
    staleTime: 30000, // Cache for 30 seconds
  });

  // Mutation to mark notifications as read
  const markAsReadMutation = useMutation({
    mutationFn: () => apiClient.markNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.NOTIFICATIONS] });
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.BADGE_COUNT] });
    },
  });

  const notifications = notificationsData?.data || [];
  const unreadNotifications = notifications.filter(notification => !notification.read);
  const recentUnreadNotifications = unreadNotifications.slice(0, 5); // Show only 5 most recent unread

  const handleMarkAllAsRead = () => {
    if (unreadNotifications.length > 0) {
      markAsReadMutation.mutate();
    }
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Trigger element (notification icon) */}
      {children}
      
      {/* Dropdown tray */}
      {isHovered && (
        <div 
          className="absolute top-full right-0 w-80 z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Invisible bridge to prevent hover loss */}
          <div className="h-2 w-full" />
          <Card className="border border-gray-200 shadow-lg bg-white">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadNotifications.length > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      disabled={markAsReadMutation.isPending}
                      className="text-xs text-[#AC6D46] hover:text-[#AC6D46]/80 font-medium transition-colors disabled:opacity-50"
                    >
                      {markAsReadMutation.isPending ? 'Marking...' : 'Mark all read'}
                    </button>
                  )}
                  {badgeCount > 0 && (
                    <Badge variant="secondary" className="text-xs bg-[#AC6D46] text-white">
                      {badgeCount} new
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Notifications list */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-pulse text-gray-500 text-sm">Loading...</div>
                  </div>
                ) : recentUnreadNotifications.length > 0 ? (
                  recentUnreadNotifications.map((notification, index) => (
                    <NotificationItem key={index} notification={notification} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm">No unread notifications</p>
                  </div>
                )}
              </div>
              
              {/* View all link */}
              {unreadNotifications.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button 
                    className={`text-sm text-[#AC6D46] hover:text-[#AC6D46]/80 font-medium w-full text-center transition-colors ${isNavigating ? 'opacity-60' : ''}`}
                    onClick={() => navigateTo('/notifications')}
                    disabled={isNavigating}
                  >
                    View all notifications
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const NotificationItem: React.FC<{ notification: IUserNotification }> = ({ notification }) => {
  const { mentionUser, date, read, context, postId } = notification;
  
  // Fetch entry title for LIKE notifications
  const { data: postData } = useQuery({
    queryKey: [API_QUERY_KEYS.POSTS, postId],
    queryFn: () => apiClient.getPostById({ query: { id: postId! } }).then(({ data }) => data),
    enabled: context === UserNotificationContext.LIKE && !!postId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  const timeAgo = getTimeAgo(new Date(date));
  const entryTitle = postData?.title;
  const formattedText = formatNotificationText(notification, entryTitle);
  
  return (
    <div className={`flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${!read ? 'bg-blue-50/50' : ''}`}>
      <UserAvatar 
        src={mentionUser.picture} 
        className="w-8 h-8 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-900">
              {formattedText}
            </p>
            <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
          </div>
          {!read && (
            <div className="w-2 h-2 bg-[#AC6D46] rounded-full flex-shrink-0 mt-1 ml-2"></div>
          )}
        </div>
      </div>
    </div>
  );
};