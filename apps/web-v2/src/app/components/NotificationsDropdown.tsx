'use client';

import { useState, useEffect } from 'react';
import { formatCurrency } from '@/app/utils/formatCurrency';
import { useRouter } from 'next/navigation';
import { NotificationCardCompact } from '@/app/components/NotificationCardCompact';
import { Bell, Loader2 } from 'lucide-react';
import { notificationApi, Notification as ApiNotification } from '@/app/services/api';
import { UserNotificationContext } from "@repo/types";

type NotificationType = `${UserNotificationContext}`;

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  timestamp: string;
  isRead: boolean;
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

// Helper to generate notification title (title only, no message needed for compact cards)
function formatNotification(apiNotif: ApiNotification): string {
  const context = apiNotif.context as NotificationType;
  const actor = apiNotif.mentionUser?.username || 'Someone';

  switch (context) {
    case 'follow':
      return `${actor} followed your journal`;
    case 'sponsorship':
    case 'quick_sponsor': {
      const amount = apiNotif.sponsorshipAmount ? `$${formatCurrency(apiNotif.sponsorshipAmount / 100)}` : '';
      return amount ? `${actor} sponsored ${amount}` : `${actor} sponsored you`;
    }
    case 'comment':
      return apiNotif.postTitle
        ? `${actor} left a note on "${apiNotif.postTitle}"`
        : `${actor} left a note`;
    case 'comment_reply':
      return apiNotif.postTitle
        ? `${actor} replied on "${apiNotif.postTitle}"`
        : `${actor} replied to your note`;
    case 'expedition_note_created':
      return `${actor} logged a new expedition note`;
    case 'expedition_note_reply':
      return `${actor} replied to your expedition note`;
    case 'new_entry':
      return apiNotif.body
        ? `${actor} logged a new entry: "${apiNotif.body}"`
        : `${actor} logged a new entry`;
    case 'new_entry_early_access':
      return apiNotif.body
        ? `${actor} logged a new entry (early access): "${apiNotif.body}"`
        : `${actor} logged a new entry (early access)`;
    case 'new_expedition':
      return apiNotif.body
        ? `${actor} started a new expedition: "${apiNotif.body}"`
        : `${actor} started a new expedition`;
    case 'entry_milestone':
      return 'Entry Milestone';
    case 'expedition_started':
      return 'Expedition Started';
    case 'expedition_completed':
      return 'Expedition Completed';
    case 'expedition_off_grid':
      return 'Expedition Off-Grid';
    case 'sponsorship_milestone':
      return 'Funding Milestone';
    case 'passport_country':
      return `Visited ${apiNotif.passportCountryName || 'a new country'}`;
    case 'passport_continent':
      return `Explored ${apiNotif.passportContinentName || 'a new continent'}`;
    case 'passport_stamp':
      return `Earned "${apiNotif.passportStampName || 'Achievement'}" stamp`;
    case 'stripe_action_required':
      return 'Stripe Action Required';
    case 'stripe_verified':
      return 'Stripe Account Verified';
    case 'expedition_cancelled': {
      const cancelledName = apiNotif.body?.match(/"([^"]+)"/)?.[1];
      return cancelledName ? `"${cancelledName}" cancelled` : 'Expedition Cancelled';
    }
    case 'expedition_date_changed': {
      const changedName = apiNotif.body?.match(/"([^"]+)"/)?.[1];
      return changedName ? `"${changedName}" dates changed` : 'Expedition Date Changed';
    }
    case 'system':
      return 'System';
    default:
      return 'Notification';
  }
}

// Map API notification to component format
function mapApiNotification(apiNotif: ApiNotification, index: number): Notification {
  return {
    id: `notif-${index}-${apiNotif.date}`,
    type: (apiNotif.context || 'system') as NotificationType,
    title: formatNotification(apiNotif),
    timestamp: formatRelativeTime(apiNotif.date),
    isRead: apiNotif.read || false,
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
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = () => {
    router.push('/notifications');
    onClose();
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-1rem)] border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] shadow-lg z-50">
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
              className="px-2 py-0.5 bg-[#616161] hover:bg-[#4a4a4a] text-white text-xs font-bold rounded-full transition-colors"
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
                timestamp={notification.timestamp}
                isRead={notification.isRead}
                onClick={handleNotificationClick}
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
        </button>
      </div>
    </div>
  );
}
