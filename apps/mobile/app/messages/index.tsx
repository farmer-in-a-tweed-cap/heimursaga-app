import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { SearchBar } from '@/components/ui/SearchBar';
import { HCard } from '@/components/ui/HCard';
import { HButton } from '@/components/ui/HButton';
import { ConversationItem } from '@/components/ui/ConversationItem';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import { NavBar } from '@/components/ui/NavBar';
import type { Conversation } from '@/types/api';

export default function MessagesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user } = useAuth();
  const isPro = !!user?.is_pro;
  const { data: conversations, loading } = useApi<Conversation[]>(
    ready && isPro ? '/messages/conversations' : null,
  );

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="MESSAGES" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="MESSAGES" />

      <ScrollView>
        {!isPro ? (
          <View style={styles.upgradeWrap}>
            <View style={[styles.upgradeCard, { backgroundColor: colors.card, borderColor: brandColors.copper }]}>
              <Text style={[styles.upgradeTitle, { color: colors.text }]}>Explorer Pro</Text>
              <Text style={[styles.upgradeDesc, { color: colors.textSecondary }]}>
                Upgrade to Explorer Pro to send and receive direct messages with other explorers.
              </Text>
              <HButton variant="copper" onPress={() => Linking.openURL('https://heimursaga.com/upgrade')}>
                UPGRADE ON WEB
              </HButton>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.searchWrap}>
              <SearchBar placeholder="Search conversations..." />
            </View>

            <View style={styles.listWrap}>
              {(!conversations || conversations.length === 0) && !loading && (
                <Text style={[styles.empty, { color: colors.textTertiary }]}>No conversations</Text>
              )}

              {conversations && conversations.length > 0 && (
                <HCard>
                  {conversations.map((convo, i) => (
                    <View
                      key={convo.recipientUsername ?? convo.username}
                      style={i > 0 ? [styles.divider, { borderTopColor: colors.borderThin }] : undefined}
                    >
                      <ConversationItem
                        username={convo.recipientUsername ?? convo.username ?? ''}
                        message={convo.lastMessage?.content ?? convo.last_message ?? ''}
                        time={convo.lastMessage?.createdAt ? formatTimeAgo(String(convo.lastMessage.createdAt)) : convo.last_message_at ? formatTimeAgo(convo.last_message_at) : ''}
                        unreadCount={convo.unreadCount ?? convo.unread_count ?? 0}
                        onPress={() => router.push(`/messages/${convo.recipientUsername ?? convo.username}`)}
                      />
                    </View>
                  ))}
                </HCard>
              )}
            </View>

            <View style={styles.spacer} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return '';
  const diff = Date.now() - time;
  if (diff < 60000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
  upgradeWrap: { padding: 16, paddingVertical: 24 },
  upgradeCard: { borderWidth: borders.thick, padding: 20, gap: 14 },
  upgradeTitle: { fontFamily: mono, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
  upgradeDesc: { fontFamily: mono, fontSize: 12, lineHeight: 18 },
  spacer: { height: 32 },
});
