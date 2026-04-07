import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { HCard } from '@/components/ui/HCard';
import { NotificationItem } from '@/components/ui/NotificationItem';
import { notificationsApi } from '@/services/api';
import { mono, colors as brandColors } from '@/theme/tokens';
import type { Notification } from '@/types/api';

interface NotificationsResponse {
  results: number;
  data: Notification[];
  page: number;
}

function formatNotification(n: Notification): { action: string; detail?: string; amount?: string } {
  const actor = n.mentionUser?.username || 'Someone';

  switch (n.context) {
    case 'follow':
      return { action: 'followed your journal' };
    case 'sponsorship': {
      const amt = n.sponsorshipAmount ? `$${(n.sponsorshipAmount / 100).toFixed(2)}` : undefined;
      return { action: 'sponsored you', amount: amt };
    }
    case 'comment':
      return {
        action: n.postTitle ? `left a note on "${n.postTitle}"` : 'left a note',
        detail: n.body ? `"${n.body.slice(0, 200)}${n.body.length > 200 ? '...' : ''}"` : undefined,
      };
    case 'comment_reply':
      return {
        action: n.postTitle ? `replied on "${n.postTitle}"` : 'replied to your note',
        detail: n.body ? `"${n.body.slice(0, 200)}${n.body.length > 200 ? '...' : ''}"` : undefined,
      };
    case 'expedition_note_created':
      return {
        action: 'logged a new expedition note',
        detail: n.body ? `"${n.body.slice(0, 200)}${n.body.length > 200 ? '...' : ''}"` : undefined,
      };
    case 'expedition_note_reply':
      return {
        action: 'replied to your expedition note',
        detail: n.body ? `"${n.body.slice(0, 200)}${n.body.length > 200 ? '...' : ''}"` : undefined,
      };
    case 'passport_country':
      return { action: `You visited ${n.passportCountryName || 'a new country'}` };
    case 'passport_continent':
      return { action: `You explored ${n.passportContinentName || 'a new continent'}` };
    case 'passport_stamp':
      return { action: `You earned the "${n.passportStampName || 'Achievement'}" stamp` };
    case 'new_entry':
      return {
        action: n.body ? `logged a new entry: "${n.body}"` : 'logged a new entry',
      };
    case 'new_expedition':
      return {
        action: n.body ? `started a new expedition: "${n.body}"` : 'started a new expedition',
      };
    case 'expedition_started':
      return {
        action: n.body ? `started expedition "${n.body}"` : 'started an expedition',
      };
    default:
      return { action: n.body || n.context };
  }
}

function groupNotifications(items: Notification[]) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  const groups: { title: string; items: Notification[] }[] = [
    { title: 'TODAY', items: [] },
    { title: 'YESTERDAY', items: [] },
    { title: 'EARLIER', items: [] },
  ];

  for (const n of items) {
    const ts = new Date(n.date).getTime();
    if (ts >= todayStart) groups[0].items.push(n);
    else if (ts >= yesterdayStart) groups[1].items.push(n);
    else groups[2].items.push(n);
  }

  return groups.filter((g) => g.items.length > 0);
}

function getNotificationRoute(n: Notification): string | null {
  switch (n.context) {
    case 'follow':
      return n.mentionUser?.username ? `/explorer/${n.mentionUser.username}` : null;
    case 'comment':
    case 'comment_reply':
    case 'like':
      return n.postId ? `/entry/${n.postId}` : null;
    case 'new_entry':
      if (n.postId) return `/entry/${n.postId}`;
      if (n.expeditionPublicId) return `/expedition/${n.expeditionPublicId}`;
      return null;
    case 'sponsorship':
      if (n.expeditionPublicId) return `/expedition/${n.expeditionPublicId}`;
      return n.mentionUser?.username ? `/explorer/${n.mentionUser.username}` : null;
    case 'expedition_note_created':
    case 'expedition_note_reply':
    case 'new_expedition':
    case 'expedition_started':
    case 'expedition_completed':
    case 'expedition_off_grid':
    case 'expedition_cancelled':
    case 'expedition_date_changed':
      return n.expeditionPublicId ? `/expedition/${n.expeditionPublicId}` : null;
    case 'passport_country':
    case 'passport_continent':
    case 'passport_stamp':
      return '/(tabs)/profile';
    default:
      return null;
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const { data: rawData, loading, refetch } = useApi<{ success: boolean; data: NotificationsResponse }>(
    ready ? '/auth/mobile/notifications' : null, { refetchOnFocus: true },
  );

  const notifications = rawData?.data?.data ?? [];
  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to mark notifications as read');
    }
  }, [refetch]);

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar
        onBack={() => router.back()}
        title="NOTIFICATIONS"
        right={
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markRead}>MARK ALL READ</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView>
        {groups.length === 0 && !loading && (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No notifications</Text>
        )}

        {groups.map((group) => (
          <View key={group.title}>
            <SectionDivider title={group.title} />
            <View style={styles.sectionContent}>
              <HCard>
                {group.items.map((notif, i) => {
                  const { action, detail, amount } = formatNotification(notif);
                  const username = notif.mentionUser?.username ?? '';
                  const route = getNotificationRoute(notif);
                  return (
                    <View
                      key={`${notif.context}-${notif.date}-${i}`}
                      style={i > 0 ? [styles.divider, { borderTopColor: colors.borderThin }] : undefined}
                    >
                      <NotificationItem
                        username={username}
                        action={action}
                        amount={amount}
                        detail={detail}
                        time={formatTimeAgo(notif.date)}
                        unread={!notif.read}
                        onPress={route ? () => router.push(route as any) : undefined}
                      />
                    </View>
                  );
                })}
              </HCard>
            </View>
          </View>
        ))}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  markRead: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.copper,
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  divider: {
    borderTopWidth: 1,
  },
  empty: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 40,
  },
  spacer: { height: 32 },
});
