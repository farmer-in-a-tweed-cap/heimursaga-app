'use client';

import { useState, useEffect, ReactNode, Fragment } from 'react';
import { formatCurrency } from '@/app/utils/formatCurrency';
import {
  Bell,
  Filter,
  ChevronDown,
  Circle,
  Lock,
  Loader2
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { NotificationCard } from '@/app/components/NotificationCard';
import { ShareAchievementModal } from '@/app/components/ShareAchievementModal';
import { useAuth } from '@/app/context/AuthContext';
import { notificationApi, Notification as ApiNotification } from '@/app/services/api';
import { UserNotificationContext } from "@repo/types";

type NotificationType = `${UserNotificationContext}`;

interface Notification {
  id: string;
  type: NotificationType;
  titleText: string;
  actor?: string;
  message: string;
  timestamp: string;
  timestampDate: Date;
  isRead: boolean;
  actorPicture?: string;
  metadata?: {
    amount?: number;
    expeditionName?: string;
    expeditionId?: string;
    entryTitle?: string;
    postId?: string;
    sponsorshipType?: string;
    // Passport fields
    countryCode?: string;
    countryName?: string;
    continentCode?: string;
    continentName?: string;
    stampName?: string;
  };
}

// Render _text_ as italic
function renderMessage(text: string): ReactNode {
  const parts = text.split(/_(.*?)_/);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <em key={i}>{part}</em> : part
  );
}

// Replace a source name in a string with a hyperlink, preserving surrounding text
function hyperlinkInText(text: string, name: string, href: string, linkClass: string): ReactNode {
  const idx = text.indexOf(name);
  if (idx === -1) return renderMessage(text);
  const before = text.slice(0, idx);
  const after = text.slice(idx + name.length);
  return (
    <>
      {before && renderMessage(before)}
      <Link href={href} className={linkClass}>{name}</Link>
      {after && renderMessage(after)}
    </>
  );
}

// Build message as ReactNode, hyperlinking source references if present
function buildMessage(
  message: string,
  metadata: Notification['metadata'],
  linkClass: string,
): ReactNode {
  if (!message) return null;

  // Try to hyperlink entry title in message
  if (metadata?.entryTitle && metadata?.postId && message.includes(metadata.entryTitle)) {
    return hyperlinkInText(message, metadata.entryTitle, `/entry/${metadata.postId}`, linkClass);
  }
  // Try to hyperlink expedition name in message
  if (metadata?.expeditionName && metadata?.expeditionId && message.includes(metadata.expeditionName)) {
    return hyperlinkInText(message, metadata.expeditionName, `/expedition/${metadata.expeditionId}`, linkClass);
  }

  return renderMessage(message);
}

// Helper to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
}

// Helper to generate notification title text (without actor) and message
function formatNotification(apiNotif: ApiNotification): { titleText: string; message: string } {
  const context = apiNotif.context as NotificationType;

  switch (context) {
    case 'follow':
      return {
        titleText: 'followed your journal',
        message: ''
      };
    case 'sponsorship':
    case 'quick_sponsor': {
      const amount = apiNotif.sponsorshipAmount ? `$${formatCurrency(apiNotif.sponsorshipAmount / 100)}` : '';
      const parts: string[] = [];
      if (apiNotif.body) parts.push(`"${apiNotif.body}"`);
      return {
        titleText: amount ? `sponsored ${amount}` : 'sponsored you',
        message: parts.join(' · ')
      };
    }
    case 'comment':
      return {
        titleText: apiNotif.postTitle
          ? `left a note on "${apiNotif.postTitle}"`
          : 'left a note',
        message: apiNotif.body
          ? `"${apiNotif.body.slice(0, 300)}${apiNotif.body.length > 300 ? '...' : ''}"`
          : ''
      };
    case 'comment_reply':
      return {
        titleText: apiNotif.postTitle
          ? `replied on "${apiNotif.postTitle}"`
          : 'replied to your note',
        message: apiNotif.body
          ? `"${apiNotif.body.slice(0, 300)}${apiNotif.body.length > 300 ? '...' : ''}"`
          : ''
      };
    case 'expedition_note_reply':
      return {
        titleText: 'replied to your expedition note',
        message: apiNotif.body
          ? `"${apiNotif.body.slice(0, 300)}${apiNotif.body.length > 300 ? '...' : ''}"`
          : '',
      };
    case 'entry_milestone':
      return {
        titleText: 'Entry Milestone',
        message: apiNotif.body || ''
      };
    case 'expedition_started':
      return {
        titleText: 'Expedition Started',
        message: apiNotif.body || ''
      };
    case 'expedition_completed':
      return {
        titleText: 'Expedition Completed',
        message: apiNotif.body || ''
      };
    case 'expedition_off_grid':
      return {
        titleText: 'Expedition Off-Grid',
        message: apiNotif.body || ''
      };
    case 'sponsorship_milestone':
      return {
        titleText: 'Funding Milestone',
        message: apiNotif.body || ''
      };
    case 'passport_country':
      return {
        titleText: `Visited ${apiNotif.passportCountryName || 'a new country'}`,
        message: ''
      };
    case 'passport_continent':
      return {
        titleText: `Explored ${apiNotif.passportContinentName || 'a new continent'}`,
        message: ''
      };
    case 'passport_stamp':
      return {
        titleText: `Earned "${apiNotif.passportStampName || 'Achievement'}" stamp`,
        message: ''
      };
    case 'stripe_action_required':
      return {
        titleText: 'Stripe Action Required',
        message: apiNotif.body || 'Your Stripe account requires attention'
      };
    case 'stripe_verified':
      return {
        titleText: 'Stripe Account Verified',
        message: apiNotif.body || 'You can now receive sponsorships!'
      };
    case 'expedition_cancelled':
      return {
        titleText: 'Expedition Cancelled',
        message: apiNotif.body || ''
      };
    case 'expedition_date_changed':
      return {
        titleText: 'Expedition Date Changed',
        message: apiNotif.body || ''
      };
    case 'system':
      return {
        titleText: 'System',
        message: apiNotif.body || ''
      };
    default:
      return {
        titleText: 'Notification',
        message: apiNotif.body || ''
      };
  }
}

// Map API notification to component format
function mapApiNotification(apiNotif: ApiNotification, index: number): Notification {
  const { titleText, message } = formatNotification(apiNotif);
  const date = new Date(apiNotif.date);

  return {
    id: `notif-${index}-${apiNotif.date}`,
    type: (apiNotif.context || 'system') as NotificationType,
    titleText,
    message,
    timestamp: formatRelativeTime(date),
    timestampDate: date,
    isRead: apiNotif.read || false,
    actor: apiNotif.mentionUser?.username,
    actorPicture: apiNotif.mentionUser?.picture,
    metadata: {
      amount: apiNotif.sponsorshipAmount,
      postId: apiNotif.postId,
      entryTitle: apiNotif.postTitle,
      expeditionId: apiNotif.expeditionPublicId,
      expeditionName: apiNotif.expeditionTitle,
      sponsorshipType: apiNotif.sponsorshipType,
      countryCode: apiNotif.passportCountryCode,
      countryName: apiNotif.passportCountryName,
      continentCode: apiNotif.passportContinentCode,
      continentName: apiNotif.passportContinentName,
      stampName: apiNotif.passportStampName,
    }
  };
}

// Types that have an actor link
const ACTOR_TYPES: NotificationType[] = [
  'follow', 'sponsorship', 'quick_sponsor', 'comment', 'comment_reply', 'expedition_note_reply'
];

export function NotificationsPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [filterType, setFilterType] = useState<'all' | 'passport' | NotificationType>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'type'>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Share achievement modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<{
    type: 'passport_country' | 'passport_continent' | 'passport_stamp';
    achievementName: string;
    countryCode?: string;
    continentCode?: string;
  } | null>(null);

  // Fetch notifications from API
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function fetchNotifications() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await notificationApi.getAll();
        if (!cancelled) {
          const mapped = response.data.map((n, i) => mapApiNotification(n, i));
          setNotifications(mapped);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load notifications');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchNotifications();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Authentication gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] text-white">
            <div className="flex items-center gap-3">
              <Lock size={24} strokeWidth={2} />
              <h2 className="text-lg font-bold">AUTHENTICATION REQUIRED</h2>
            </div>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              You must be logged in to view notifications. Please log in to see your activity updates.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/auth?from=' + pathname)}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
              >
                LOG IN / REGISTER
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(n => {
      if (filterType !== 'all') {
        // Handle group filters
        if (filterType === 'passport') {
          if (!['passport_country', 'passport_continent', 'passport_stamp'].includes(n.type)) return false;
        } else if (filterType === 'sponsorship') {
          if (!['sponsorship', 'quick_sponsor'].includes(n.type)) return false;
        } else if (n.type !== filterType) {
          return false;
        }
      }
      if (filterRead === 'read' && !n.isRead) return false;
      if (filterRead === 'unread' && n.isRead) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.timestampDate.getTime() - a.timestampDate.getTime();
      if (sortBy === 'oldest') return a.timestampDate.getTime() - b.timestampDate.getTime();
      if (sortBy === 'type') return a.type.localeCompare(b.type);
      return 0;
    });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const totalCount = notifications.length;

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Build sourceLink for a notification
  const getSourceLink = (notification: Notification): { type: 'entry' | 'expedition'; id: string; title: string } | undefined => {
    const { type, metadata } = notification;

    switch (type) {
      case 'sponsorship':
      case 'quick_sponsor':
        if (metadata?.postId && metadata?.entryTitle && !notification.message.includes(metadata.entryTitle)) {
          return { type: 'entry', id: metadata.postId, title: metadata.entryTitle };
        }
        if (metadata?.expeditionId && metadata?.expeditionName && !notification.message.includes(metadata.expeditionName)) {
          return { type: 'expedition', id: metadata.expeditionId, title: metadata.expeditionName };
        }
        return undefined;

      case 'comment':
      case 'comment_reply':
        // Title already references the post name, no need for a source link
        return undefined;

      case 'expedition_note_reply':
        if (metadata?.expeditionId && metadata?.expeditionName) {
          return { type: 'expedition', id: metadata.expeditionId, title: metadata.expeditionName };
        }
        return undefined;

      case 'entry_milestone':
        if (metadata?.postId && metadata?.entryTitle && !notification.message.includes(metadata.entryTitle)) {
          return { type: 'entry', id: metadata.postId, title: metadata.entryTitle };
        }
        return undefined;

      case 'expedition_started':
      case 'expedition_completed':
      case 'expedition_cancelled':
      case 'expedition_date_changed':
      case 'sponsorship_milestone':
        // Only show source link if the message doesn't already mention the expedition name
        if (metadata?.expeditionId && metadata?.expeditionName && !notification.message.includes(metadata.expeditionName)) {
          return { type: 'expedition', id: metadata.expeditionId, title: metadata.expeditionName };
        }
        return undefined;

      default:
        return undefined;
    }
  };

  // Build shareAction for passport types
  const getShareAction = (notification: Notification): (() => void) | undefined => {
    if (notification.type === 'passport_country') {
      return () => {
        setShareModalData({
          type: 'passport_country',
          achievementName: notification.metadata?.countryName || 'New Country',
          countryCode: notification.metadata?.countryCode,
        });
        setShareModalOpen(true);
      };
    }
    if (notification.type === 'passport_continent') {
      return () => {
        setShareModalData({
          type: 'passport_continent',
          achievementName: notification.metadata?.continentName || 'New Continent',
          continentCode: notification.metadata?.continentCode,
        });
        setShareModalOpen(true);
      };
    }
    if (notification.type === 'passport_stamp') {
      return () => {
        setShareModalData({
          type: 'passport_stamp',
          achievementName: notification.metadata?.stampName || 'Achievement',
        });
        setShareModalOpen(true);
      };
    }
    return undefined;
  };

  const linkClass = "text-[#4676ac] hover:underline font-bold";

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#616161] text-white px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <div>
              <h1 className="text-base md:text-xl font-bold">NOTIFICATIONS CENTER</h1>
              <div className="text-xs font-mono text-[#b5bcc4] mt-1 hidden md:block">
                MANAGE ALL PLATFORM NOTIFICATIONS
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{totalCount}</div>
            <div className="text-xs font-mono text-[#b5bcc4]">TOTAL</div>
          </div>
        </div>

        {/* Statistics Bar */}
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-6 py-4 border-b-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-1">UNREAD</div>
              <div className="text-2xl font-bold text-[#ac6d46]">{unreadCount}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-1">READ</div>
              <div className="text-2xl font-bold text-[#4676ac]">{totalCount - unreadCount}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-1">FILTERED</div>
              <div className="text-2xl font-bold text-[#202020] dark:text-[#e5e5e5]">{filteredNotifications.length}</div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-2 bg-[#202020] dark:bg-[#616161] text-white text-xs font-bold hover:bg-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] border-2 border-[#202020] dark:border-[#616161] flex items-center gap-2 whitespace-nowrap"
              >
                MARK ALL AS READ
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-xs font-bold transition-all border-2 border-[#202020] dark:border-[#616161] flex items-center gap-2 whitespace-nowrap ${
              showFilters ? 'bg-[#ac6d46] text-white' : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
            }`}
          >
            <Filter className="w-3 h-3" />
            FILTERS
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="px-6 py-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-t-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="text-xs font-medium mb-2 block text-[#202020] dark:text-[#e5e5e5]">
                  NOTIFICATION TYPE
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] text-xs font-bold"
                >
                  <option value="all">ALL TYPES</option>
                  <option value="sponsorship">SPONSORSHIP</option>
                  <option value="comment">NEW NOTE</option>
                  <option value="comment_reply">NOTE REPLY</option>
                  <option value="follow">NEW FOLLOWER</option>
                  <option value="entry_milestone">ENTRY MILESTONE</option>
                  <option value="expedition_started">EXPEDITION STARTED</option>
                  <option value="expedition_completed">EXPEDITION COMPLETE</option>
                  <option value="expedition_off_grid">EXPEDITION STATUS</option>
                  <option value="sponsorship_milestone">FUNDING MILESTONE</option>
                  <option value="expedition_cancelled">EXPEDITION CANCELLED</option>
                  <option value="expedition_date_changed">DATE CHANGED</option>
                  <option value="stripe_action_required">STRIPE ACTION REQUIRED</option>
                  <option value="stripe_verified">STRIPE VERIFIED</option>
                  <option value="passport">PASSPORT</option>
                </select>
              </div>

              {/* Read Status Filter */}
              <div>
                <label className="text-xs font-medium mb-2 block text-[#202020] dark:text-[#e5e5e5]">
                  READ STATUS
                </label>
                <select
                  value={filterRead}
                  onChange={(e) => setFilterRead(e.target.value as typeof filterRead)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] text-xs font-bold"
                >
                  <option value="all">ALL NOTIFICATIONS</option>
                  <option value="unread">UNREAD ONLY</option>
                  <option value="read">READ ONLY</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs font-medium mb-2 block text-[#202020] dark:text-[#e5e5e5]">
                  SORT BY
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] text-xs font-bold"
                >
                  <option value="newest">NEWEST FIRST</option>
                  <option value="oldest">OLDEST FIRST</option>
                  <option value="type">BY TYPE</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#616161]" />
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">{error}</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
          <Circle className="w-16 h-16 mx-auto mb-4 text-[#b5bcc4] opacity-30" />
          <div className="text-sm font-bold mb-2 text-[#616161] dark:text-[#b5bcc4]">NO NOTIFICATIONS FOUND</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            {filterType !== 'all' || filterRead !== 'all'
              ? 'Try adjusting your filters'
              : 'You\'re all caught up'}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => {
            const hasActor = ACTOR_TYPES.includes(notification.type) && notification.actor;

            // Build title as JSX — hyperlink actor and any source reference in titleText
            let titleContent: ReactNode = notification.titleText;

            // Hyperlink entry title within comment/comment_reply title text
            if ((notification.type === 'comment' || notification.type === 'comment_reply')
              && notification.metadata?.postId && notification.metadata?.entryTitle
              && notification.titleText.includes(notification.metadata.entryTitle)) {
              titleContent = hyperlinkInText(
                notification.titleText,
                notification.metadata.entryTitle,
                `/entry/${notification.metadata.postId}`,
                linkClass,
              );
            }

            const title = (
              <>
                {hasActor && (
                  <Link href={`/journal/${notification.actor}`} className={linkClass}>
                    {notification.actor}
                  </Link>
                )}
                {hasActor && ' '}
                {titleContent}
              </>
            );

            // Build message with inline hyperlinked source references
            const message = buildMessage(notification.message, notification.metadata, linkClass);

            return (
              <div key={notification.id}>
                <NotificationCard
                  type={notification.type}
                  title={title}
                  message={message}
                  timestamp={notification.timestamp}
                  isRead={notification.isRead}
                  metadata={notification.metadata}
                  sourceLink={getSourceLink(notification)}
                  shareAction={getShareAction(notification)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Share Achievement Modal */}
      {shareModalData && (
        <ShareAchievementModal
          open={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setShareModalData(null);
          }}
          type={shareModalData.type}
          achievementName={shareModalData.achievementName}
          username={user?.username || 'explorer'}
          countryCode={shareModalData.countryCode}
          continentCode={shareModalData.continentCode}
        />
      )}
    </div>
  );
}
