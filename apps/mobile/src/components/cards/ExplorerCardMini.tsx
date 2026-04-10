import React from 'react';
import { View, Text, Pressable, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { Avatar } from '@/components/ui/Avatar';
import { mono, colors as brandColors } from '@/theme/tokens';
import { getExplorerStatus, explorerStatusConfig } from '@/utils/explorerStatus';
import type { ExplorerProfile } from '@/types/api';

interface ExplorerCardMiniProps {
  explorer: ExplorerProfile;
  onPress: () => void;
  /** Show an action button at the bottom of the card */
  action?: { label: string; color: string; onPress: () => void; loading?: boolean };
}

export function ExplorerCardMini({ explorer, onPress, action }: ExplorerCardMiniProps) {
  const { colors } = useTheme();

  const status = getExplorerStatus(
    explorer.recentExpeditions ?? [],
    explorer.activeExpeditionOffGrid,
  );
  const statusCfg = explorerStatusConfig[status];

  return (
    <Pressable style={({ pressed }) => [styles.wrapper, { transform: [{ scale: pressed ? 0.98 : 1 }] }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`Explorer: ${explorer.name || explorer.username}`}>
      <HCard>
        <StatusHeader status="active" label={statusCfg.label} dotColor={statusCfg.color} />
        <View style={styles.inner}>
          <Avatar
            size={44}
            name={explorer.username}
            imageUrl={explorer.picture}
            pro={explorer.creator}
          />
          <Text style={styles.username} numberOfLines={1}>
            {explorer.username}
          </Text>
          <Text
            style={[styles.journalName, { color: explorer.name ? colors.textTertiary : 'transparent' }]}
            numberOfLines={1}
          >
            {explorer.name || '\u2014'}
          </Text>
          <Text style={[styles.stats, { color: colors.textTertiary }]}>
            {explorer.expeditionsCount ?? explorer.recentExpeditions?.length ?? 0} exped. · {explorer.entriesCount ?? explorer.postsCount ?? 0} entries
          </Text>
          {action && (
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: colors.border, opacity: action.loading ? 0.5 : 1 }]}
              onPress={(e) => { e.stopPropagation(); if (!action.loading) action.onPress(); }}
              disabled={action.loading}
            >
              {action.loading ? (
                <ActivityIndicator size="small" color={action.color} style={styles.actionSpinner} />
              ) : (
                <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </HCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  inner: {
    padding: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  username: {
    fontSize: 11,
    color: brandColors.copper,
    fontWeight: '600',
    marginTop: 8,
  },
  journalName: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  stats: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  actionBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  actionSpinner: {
    height: 15,
  },
});
