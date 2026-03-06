import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
}

export function ExplorerCardMini({ explorer, onPress }: ExplorerCardMiniProps) {
  const { colors } = useTheme();

  const status = getExplorerStatus(
    explorer.recentExpeditions ?? [],
    explorer.activeExpeditionOffGrid,
  );
  const statusCfg = explorerStatusConfig[status];

  return (
    <Pressable style={({ pressed }) => [styles.wrapper, { transform: [{ scale: pressed ? 0.98 : 1 }] }]} onPress={onPress}>
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
        </View>
      </HCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '48%',
    flexGrow: 0,
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
});
