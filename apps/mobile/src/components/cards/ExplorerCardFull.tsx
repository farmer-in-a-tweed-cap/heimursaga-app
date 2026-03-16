import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { Avatar } from '@/components/ui/Avatar';
import { StatsBar } from '@/components/ui/StatsBar';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import { getExplorerStatus, explorerStatusConfig } from '@/utils/explorerStatus';
import type { ExplorerProfile } from '@/types/api';

interface ExplorerCardFullProps {
  explorer: ExplorerProfile;
  onPress: () => void;
}

export function ExplorerCardFull({ explorer, onPress }: ExplorerCardFullProps) {
  const { colors } = useTheme();

  const status = getExplorerStatus(
    explorer.recentExpeditions ?? [],
    explorer.activeExpeditionOffGrid,
  );
  const statusCfg = explorerStatusConfig[status];

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Explorer: ${explorer.name || explorer.username}`} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <HCard>
        <StatusHeader
          status="active"
          label={statusCfg.label}
          dotColor={statusCfg.color}
          right={explorer.creator ? 'PRO' : undefined}
        />
        <View style={styles.body}>
          <Avatar
            size={72}
            name={explorer.username}
            imageUrl={explorer.picture}
            pro={explorer.creator}
          />
          <Text style={styles.username}>{explorer.username}</Text>
          {explorer.name && (
            <Text style={[styles.journalName, { color: colors.textSecondary }]}>
              {explorer.name}
            </Text>
          )}
          {explorer.locationLives && (
            <Text style={[styles.location, { color: colors.textTertiary }]}>
              {explorer.locationLives}
            </Text>
          )}
          {explorer.bio && (
            <Text style={[styles.bio, { color: colors.textSecondary }]} numberOfLines={2}>
              {explorer.bio}
            </Text>
          )}
        </View>

        <View style={[styles.statsWrap, { borderTopColor: colors.border }]}>
          <StatsBar
            stats={[
              { value: String(explorer.expeditionsCount ?? explorer.recentExpeditions?.length ?? 0), label: 'EXPEDITIONS' },
              { value: String(explorer.entriesCount ?? explorer.postsCount ?? 0), label: 'ENTRIES' },
            ]}
          />
        </View>
      </HCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: brandColors.copper,
    marginTop: 12,
  },
  journalName: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  location: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  bio: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    textAlign: 'center',
  },
  statsWrap: {
    borderTopWidth: borders.thick,
  },
});
