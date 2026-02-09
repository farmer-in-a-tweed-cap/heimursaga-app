'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NotificationCardCompact } from '@/app/components/NotificationCardCompact';
import { Bell, ArrowRight, Loader2 } from 'lucide-react';
import { notificationApi, Notification as ApiNotification } from '@/app/services/api';
import { UserNotificationContext } from "@repo/types";

type NotificationType = `${UserNotificationContext}`;

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actor?: string;
  actorPicture?: string;
  metadata?: {
    amount?: number;
    expeditionName?: string;
    entryTitle?: string;
    postId?: string;
  };
}

interface NotificationsDropdownProps {
  onClose: () => void;
}

// Helper to format relative time
function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return `${diffWeeks}w`;
}

// Helper to generate notification title and message
// Title includes actor + action. Message only if there's actual content to show.
function formatNotification(apiNotif: ApiNotification): { title: string; message: string } {
  const context = apiNotif.context as NotificationType;
  const actor = apiNotif.mentionUser?.username || 'Someone';

  switch (context) {
    case 'follow':
      return {
        title: `${actor} followed your journal`,
        message: ''
      };
    case 'sponsorship':
      const amount = apiNotif.sponsorshipAmount ? `$${(apiNotif.sponsorshipAmount / 100).toFixed(2)}` : '';
      return {
        title: amount ? `${actor} sponsored ${amount}` : `${actor} sponsored you`,
        message: ''
      };
    case 'comment':
      return {
        title: apiNotif.postTitle
          ? `${actor} left a note on "${apiNotif.postTitle}"`
          : `${actor} left a note`,
        message: apiNotif.body
          ? `"${apiNotif.body.slice(0, 120)}${apiNotif.body.length > 120 ? '...' : ''}"`
          : ''
      };
    case 'comment_reply':
      return {
        title: apiNotif.postTitle
          ? `${actor} replied on "${apiNotif.postTitle}"`
          : `${actor} replied to your note`,
        message: apiNotif.body
          ? `"${apiNotif.body.slice(0, 120)}${apiNotif.body.length > 120 ? '...' : ''}"`
          : ''
      };
    case 'entry_milestone':
      return {
        title: 'Entry Milestone',
        message: apiNotif.body || ''
      };
    case 'expedition_started':
      return {
        title: 'Expedition Started',
        message: apiNotif.body || ''
      };
    case 'expedition_completed':
      return {
        title: 'Expedition Completed',
        message: apiNotif.body || ''
      };
    case 'sponsorship_milestone':
      return {
        title: 'Funding Milestone',
        message: apiNotif.body || ''
      };
    case 'passport_country':
      return {
        title: `Visited ${apiNotif.passportCountryName || 'a new country'}`,
        message: ''
      };
    case 'passport_continent':
      return {
        title: `Explored ${apiNotif.passportContinentName || 'a new continent'}`,
        message: ''
      };
    case 'passport_stamp':
      return {
        title: `Earned "${apiNotif.passportStampName || 'Achievement'}" stamp`,
        message: ''
      };
    case 'system':
      return {
        title: 'System',
        message: apiNotif.body || ''
      };
    default:
      return {
        title: 'Notification',
        message: apiNotif.body || ''
      };
  }
}

// Map API notification to component format
function mapApiNotification(apiNotif: ApiNotification, index: number): Notification {
  const { title, message } = formatNotification(apiNotif);

  return {
    id: `notif-${index}-${apiNotif.date}`,
    type: (apiNotif.context || 'system') as NotificationType,
    title,
    message,
    timestamp: formatRelativeTime(apiNotif.date),
    isRead: apiNotif.read || false,
    actor: apiNotif.mentionUser?.username,
    actorPicture: apiNotif.mentionUser?.picture,
    metadata: {
      amount: apiNotif.sponsorshipAmount,
      postId: apiNotif.postId,
    }
  };
}

export function NotificationsDropdown({ onClose }: NotificationsDropdownProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from API
  useEffect(() => {
    async function fetchNotifications() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await notificationApi.getAll();
        const mapped = response.data.map((n, i) => mapApiNotification(n, i));
        setNotifications(mapped);
      } catch {
        setError('Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    }
    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const totalCount = notifications.length;

  const handleMarkAsRead = async (id: string) => {
    // Optimistically update UI
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
    // Note: Individual mark as read not supported by API, only mark all
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    let target = '';

    if (notification.type === 'follow' && notification.actor) {
      target = `/journal/${notification.actor}`;
    } else if ((notification.type === 'sponsorship' || notification.type === 'comment' || notification.type === 'comment_reply') && notification.actor) {
      if (notification.metadata?.postId) {
        target = `/entry/${notification.metadata.postId}`;
      } else {
        target = `/journal/${notification.actor}`;
      }
    } else if (notification.metadata?.postId) {
      target = `/entry/${notification.metadata.postId}`;
    }

    if (target) {
      router.push(target);
    }

    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-96 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] shadow-lg z-50">
      {/* Dropdown Header */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#202020] dark:bg-[#1a1a1a] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#ac6d46]" />
            <span className="text-xs font-bold text-[#e5e5e5] tracking-wide">
              NOTIFICATIONS
            </span>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-2 py-0.5 bg-[#ac6d46] hover:bg-[#8a5738] text-white text-xs font-bold rounded-full transition-colors"
            >
              MARK ALL READ
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[#b5bcc4]">Total:</span>
            <span className="text-white font-bold">{totalCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#b5bcc4]">Unread:</span>
            <span className="text-[#ac6d46] font-bold">{unreadCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#b5bcc4]">Read:</span>
            <span className="text-white font-bold">{totalCount - unreadCount}</span>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#616161]" />
          </div>
        ) : error ? (
          <div className="text-center py-8 px-4">
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Bell className="w-8 h-8 mx-auto mb-2 text-[#b5bcc4] opacity-50" />
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <NotificationCardCompact
                key={notification.id}
                id={notification.id}
                type={notification.type}
                title={notification.title}
                message={notification.message}
                timestamp={notification.timestamp}
                isRead={notification.isRead}
                onClick={() => handleNotificationClick(notification)}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dropdown Footer */}
      <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] px-3 py-3">
        <button
          onClick={() => {
            router.push('/notifications');
            onClose();
          }}
          className="w-full px-4 py-2 bg-[#ac6d46] hover:bg-[#8a5738] text-white text-xs font-bold tracking-wide transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-2 border-2 border-[#ac6d46] hover:border-[#8a5738]"
        >
          VIEW ALL NOTIFICATIONS
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
