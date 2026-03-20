import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { CoverImage } from '@/components/ui/CoverImage';
import { FundingBar } from '@/components/ui/FundingBar';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';
import { fmtAmount } from '@/utils/formatAmount';

interface ExpeditionCardMiniProps {
  expedition: Expedition;
  onPress: () => void;
}

export function ExpeditionCardMini({ expedition, onPress }: ExpeditionCardMiniProps) {
  const { colors } = useTheme();

  const now = Date.now();
  const startMs = expedition.startDate ? new Date(expedition.startDate).getTime() : null;
  const endMs = expedition.endDate ? new Date(expedition.endDate).getTime() : null;

  const headerRight = (() => {
    if (expedition.status === 'active' && startMs) {
      return `DAY ${Math.max(1, Math.ceil((now - startMs) / 86400000))}`;
    }
    if (expedition.status === 'planned' && startMs) {
      const daysTo = Math.max(0, Math.ceil((startMs - now) / 86400000));
      return `IN ${daysTo}d`;
    }
    if (expedition.status === 'completed' && startMs && endMs) {
      return `${Math.max(1, Math.ceil((endMs - startMs) / 86400000))}d`;
    }
    return expedition.category?.toUpperCase();
  })();

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : '';

  const dateRange = expedition.startDate
    ? `${fmtDate(expedition.startDate)} \u2192 ${expedition.endDate ? fmtDate(expedition.endDate) : 'ONGOING'}`
    : '';

  const sponsorable =
    expedition.author?.creator &&
    expedition.author?.stripeAccountConnected &&
    (expedition.goal ?? 0) > 0;

  const totalRaised = (expedition.raised ?? 0) + (expedition.recurringStats?.totalCommitted ?? 0);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${expedition.title} expedition`} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <HCard>
        <StatusHeader
          status={expedition.status}
          label={`${expedition.status.toUpperCase()} EXPEDITION`}
          dotColor={expedition.status === 'active' ? brandColors.copper : undefined}
          right={headerRight}
        />
        <View style={styles.body}>
          <View style={styles.imageWrap}>
            <CoverImage uri={expedition.coverImage} height="100%" />
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {expedition.title}
            </Text>
            {expedition.author && (
              <Text style={styles.authorName} numberOfLines={1}>
                {expedition.author.username}
              </Text>
            )}
            <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
              {expedition.region?.toUpperCase() || dateRange || ''}
            </Text>
            <View style={styles.statsRow}>
              <Text style={[styles.stat, { color: brandColors.blue }]}>
                {expedition.entriesCount ?? 0} entries
              </Text>
              {sponsorable && (
                <Text style={[styles.stat, { color: brandColors.copper }]}>
                  {fmtAmount(totalRaised)}
                  <Text style={{ color: colors.textTertiary }}>
                    /{fmtAmount(expedition.goal!)}
                  </Text>
                  {' raised'}
                </Text>
              )}
            </View>
          </View>
        </View>
        {sponsorable && (
          <View style={[styles.fundingWrap, { borderTopColor: colors.border }]}>
            <FundingBar
              raised={totalRaised}
              goal={expedition.goal!}
            />
          </View>
        )}
      </HCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
    height: 110,
  },
  imageWrap: {
    width: 90,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  authorName: {
    fontSize: 12,
    color: brandColors.copper,
    fontWeight: '600',
    marginTop: 4,
  },
  meta: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  stat: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  fundingWrap: {
    borderTopWidth: borders.thin,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },
});
