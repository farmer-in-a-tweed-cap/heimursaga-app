'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Filter,
  Check,
  ChevronDown,
  CheckCircle2,
  Circle,
  Lock,
  Loader2
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { NotificationCard } from '@/app/components/NotificationCard';
import { ShareAchievementModal } from '@/app/components/ShareAchievementModal';
import { useAuth } from '@/app/context/AuthContext';
import { notificationApi, Notification as ApiNotification } from '@/app/services/api';
import { UserNotificationContext } from "@repo/types";

type NotificationType = `${UserNotificationContext}`;

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  timestampDate: Date;
  isRead: boolean;
  actor?: string;
  actorPicture?: string;
  metadata?: {
    amount?: number;
    expeditionName?: string;
    entryTitle?: string;
    postId?: string;
    // Passport fields
    countryCode?: string;
    countryName?: string;
    continentCode?: string;
    continentName?: string;
    stampName?: string;
    stampDescription?: string;
    stampImage?: string;
    firstEntryDate?: string;
  };
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
          ? `"${apiNotif.body.slice(0, 300)}${apiNotif.body.length > 300 ? '...' : ''}"`
          : ''
      };
    case 'comment_reply':
      return {
        title: apiNotif.postTitle
          ? `${actor} replied on "${apiNotif.postTitle}"`
          : `${actor} replied to your note`,
        message: apiNotif.body
          ? `"${apiNotif.body.slice(0, 300)}${apiNotif.body.length > 300 ? '...' : ''}"`
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
    case 'expedition_off_grid':
      return {
        title: 'Expedition Off-Grid',
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
  const date = new Date(apiNotif.date);

  return {
    id: `notif-${index}-${apiNotif.date}`,
    type: (apiNotif.context || 'system') as NotificationType,
    title,
    message,
    timestamp: formatRelativeTime(date),
    timestampDate: date,
    isRead: apiNotif.read || false,
    actor: apiNotif.mentionUser?.username,
    actorPicture: apiNotif.mentionUser?.picture,
    metadata: {
      amount: apiNotif.sponsorshipAmount,
      postId: apiNotif.postId,
    }
  };
}

export function NotificationsPage() {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [filterType, setFilterType] = useState<'all' | 'passport' | NotificationType>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'type'>('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
    date?: string;
    description?: string;
    stampImage?: string;
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
        // Handle "passport" as a group filter
        if (filterType === 'passport') {
          if (!['passport_country', 'passport_continent', 'passport_stamp'].includes(n.type)) return false;
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

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
  };

  const markSelectedAsRead = () => {
    setNotifications(notifications.map(n =>
      selectedIds.includes(n.id) ? { ...n, isRead: true } : n
    ));
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
    );
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'follow' && notification.actor) {
      router.push(`/journal/${notification.actor}`);
    } else if (notification.metadata?.postId) {
      router.push(`/entry/${notification.metadata.postId}`);
    } else if (notification.actor) {
      router.push(`/journal/${notification.actor}`);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="bg-[#616161] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161]">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">NOTIFICATIONS CENTER</h1>
              <div className="text-xs font-mono text-[#b5bcc4] mt-1">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div>
              <div className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4] mb-1">SELECTED</div>
              <div className="text-2xl font-bold text-[#202020] dark:text-[#e5e5e5]">{selectedIds.length}</div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="px-3 py-2 bg-[#616161] text-white text-xs font-bold hover:bg-[#4676ac] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] border-2 border-[#202020] dark:border-[#616161] flex items-center gap-2 whitespace-nowrap"
            >
              <Check className="w-3 h-3" />
              {selectedIds.length === filteredNotifications.length ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>

            {selectedIds.length > 0 && (
              <>
                <button
                  onClick={markSelectedAsRead}
                  className="px-3 py-2 bg-[#ac6d46] text-white text-xs font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] border-2 border-[#202020] dark:border-[#616161] flex items-center gap-2 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  MARK AS READ ({selectedIds.length})
                </button>
              </>
            )}

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-2 bg-[#202020] dark:bg-[#616161] text-white text-xs font-bold hover:bg-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] border-2 border-[#202020] dark:border-[#616161] flex items-center gap-2 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3 h-3" />
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
            // Build action buttons based on notification type
            const actions: {
              primary?: { label: string; onClick: () => void };
              secondary?: { label: string; onClick: () => void };
            } = {};

            switch (notification.type) {
              case 'follow':
                if (notification.actor) {
                  actions.primary = {
                    label: 'VIEW JOURNAL',
                    onClick: () => router.push(`/journal/${notification.actor}`)
                  };
                }
                break;

              case 'sponsorship':
                if (notification.actor) {
                  actions.primary = {
                    label: 'VIEW JOURNAL',
                    onClick: () => router.push(`/journal/${notification.actor}`)
                  };
                }
                break;

              case 'comment':
                if (notification.metadata?.postId) {
                  actions.primary = {
                    label: 'VIEW ENTRY',
                    onClick: () => router.push(`/entry/${notification.metadata?.postId}`)
                  };
                }
                if (notification.actor) {
                  actions.secondary = {
                    label: 'VIEW JOURNAL',
                    onClick: () => router.push(`/journal/${notification.actor}`)
                  };
                }
                break;

              case 'comment_reply':
                if (notification.metadata?.postId) {
                  actions.primary = {
                    label: 'VIEW ENTRY',
                    onClick: () => router.push(`/entry/${notification.metadata?.postId}`)
                  };
                }
                if (notification.actor) {
                  actions.secondary = {
                    label: 'VIEW JOURNAL',
                    onClick: () => router.push(`/journal/${notification.actor}`)
                  };
                }
                break;

              case 'entry_milestone':
                if (notification.metadata?.postId) {
                  actions.primary = {
                    label: 'VIEW ENTRY',
                    onClick: () => router.push(`/entry/${notification.metadata?.postId}`)
                  };
                }
                break;

              case 'expedition_started':
              case 'expedition_completed':
                actions.primary = {
                  label: 'VIEW EXPEDITION',
                  onClick: () => router.push(`/expedition/${notification.metadata?.expeditionName?.toLowerCase().replace(/\s+/g, '-') || 'current'}`)
                };
                break;

              case 'expedition_off_grid':
                actions.primary = {
                  label: 'VIEW SPONSORSHIPS',
                  onClick: () => router.push('/sponsorship')
                };
                break;

              case 'sponsorship_milestone':
                actions.primary = {
                  label: 'VIEW EXPEDITION',
                  onClick: () => router.push(`/expedition/${notification.metadata?.expeditionName?.toLowerCase().replace(/\s+/g, '-') || 'current'}`)
                };
                break;

              case 'passport_country':
                actions.primary = {
                  label: 'VIEW PASSPORT',
                  onClick: () => user?.username && router.push(`/journal/${user.username}`)
                };
                actions.secondary = {
                  label: 'SHARE',
                  onClick: () => {
                    setShareModalData({
                      type: 'passport_country',
                      achievementName: notification.metadata?.countryName || 'New Country',
                      countryCode: notification.metadata?.countryCode,
                      date: notification.metadata?.firstEntryDate
                    });
                    setShareModalOpen(true);
                  }
                };
                break;

              case 'passport_continent':
                actions.primary = {
                  label: 'VIEW PASSPORT',
                  onClick: () => user?.username && router.push(`/journal/${user.username}`)
                };
                actions.secondary = {
                  label: 'SHARE',
                  onClick: () => {
                    setShareModalData({
                      type: 'passport_continent',
                      achievementName: notification.metadata?.continentName || 'New Continent',
                      continentCode: notification.metadata?.continentCode,
                      date: notification.metadata?.firstEntryDate
                    });
                    setShareModalOpen(true);
                  }
                };
                break;

              case 'passport_stamp':
                actions.primary = {
                  label: 'VIEW PASSPORT',
                  onClick: () => user?.username && router.push(`/journal/${user.username}`)
                };
                actions.secondary = {
                  label: 'SHARE',
                  onClick: () => {
                    setShareModalData({
                      type: 'passport_stamp',
                      achievementName: notification.metadata?.stampName || 'Achievement',
                      description: notification.metadata?.stampDescription,
                      stampImage: notification.metadata?.stampImage,
                      date: notification.metadata?.firstEntryDate
                    });
                    setShareModalOpen(true);
                  }
                };
                break;

              case 'system':
                actions.primary = {
                  label: 'VIEW SETTINGS',
                  onClick: () => router.push('/settings')
                };
                break;

              default:
                actions.primary = {
                  label: 'VIEW',
                  onClick: () => handleNotificationClick(notification)
                };
            }

            return (
              <div key={notification.id}>
                <NotificationCard
                  id={notification.id}
                  type={notification.type}
                  title={notification.title}
                  message={notification.message}
                  actor={notification.actor}
                  timestamp={notification.timestamp}
                  isRead={notification.isRead}
                  metadata={notification.metadata}
                  actions={actions}
                  onClick={() => handleNotificationClick(notification)}
                  isSelected={selectedIds.includes(notification.id)}
                  onSelect={toggleSelect}
                  onDelete={deleteNotification}
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
          date={shareModalData.date}
          description={shareModalData.description}
          stampImage={shareModalData.stampImage}
        />
      )}
    </div>
  );
}
