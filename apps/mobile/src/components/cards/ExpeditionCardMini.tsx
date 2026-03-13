import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { CoverImage } from '@/components/ui/CoverImage';
import { FundingBar } from '@/components/ui/FundingBar';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';

interface ExpeditionCardMiniProps {
  expedition: Expedition;
  onPress: () => void;
}

export function ExpeditionCardMini({ expedition, onPress }: ExpeditionCardMiniProps) {
  const { colors } = useTheme();

  const dayCount = expedition.startDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(expedition.startDate).getTime()) / 86400000))
    : undefined;

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : '';

  const dateRange = expedition.startDate
    ? `${fmtDate(expedition.startDate)} \u2192 ${expedition.endDate ? fmtDate(expedition.endDate) : 'ONGOING'}`
    : '';

  const sponsorable =
    expedition.author?.creator &&
    expedition.author?.stripeAccountConnected &&
    (expedition.goal ?? 0) > 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <HCard>
        <StatusHeader
          status={expedition.status}
          label={`${expedition.status.toUpperCase()} EXPEDITION`}
          dotColor={expedition.status === 'active' ? brandColors.copper : undefined}
          right={
            expedition.status === 'active' && dayCount
              ? `DAY ${dayCount}`
              : expedition.category?.toUpperCase()
          }
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
              <Text style={[styles.stat, { color: brandColors.copper }]}>
                ${(expedition.raised ?? 0).toLocaleString()} raised
              </Text>
            </View>
          </View>
        </View>
        {sponsorable && (
          <View style={[styles.fundingWrap, { borderTopColor: colors.border }]}>
            <FundingBar
              raised={expedition.raised ?? 0}
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
