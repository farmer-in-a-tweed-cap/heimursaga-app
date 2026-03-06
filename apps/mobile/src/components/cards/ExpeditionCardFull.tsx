import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { CoverImage } from '@/components/ui/CoverImage';
import { Avatar } from '@/components/ui/Avatar';
import { StatsBar } from '@/components/ui/StatsBar';
import { FundingBar } from '@/components/ui/FundingBar';
import { colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';

interface ExpeditionCardFullProps {
  expedition: Expedition;
  onPress: () => void;
}

export function ExpeditionCardFull({ expedition, onPress }: ExpeditionCardFullProps) {
  const { colors } = useTheme();

  const dayCount = expedition.startDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(expedition.startDate).getTime()) / 86400000))
    : undefined;

  const sponsorable =
    expedition.author?.creator &&
    expedition.author?.stripeAccountConnected &&
    (expedition.goal ?? 0) > 0;

  const rightLabel =
    expedition.visibility && expedition.visibility !== 'public'
      ? expedition.visibility.toUpperCase()
      : expedition.category?.toUpperCase();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <HCard>
        <StatusHeader
          status={expedition.status}
          label={`${expedition.status.toUpperCase()} EXPEDITION`}
          dotColor={expedition.status === 'active' ? brandColors.copper : undefined}
          right={rightLabel}
        />
        <CoverImage uri={expedition.coverImage} height={160} label="COVER IMAGE" />
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {expedition.title}
          </Text>
          {expedition.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
              {expedition.description}
            </Text>
          )}
          {expedition.author && (
            <View style={styles.authorRow}>
              <Avatar size={20} name={expedition.author.username} imageUrl={expedition.author.picture} pro={expedition.author.creator} />
              <Text style={styles.authorName}>
                {expedition.author.name || expedition.author.username}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.statsWrap, { borderTopColor: colors.border }]}>
          <StatsBar
            stats={[
              {
                value: dayCount != null ? String(dayCount) : '\u2014',
                label: expedition.status === 'active' ? 'DAYS ACTIVE' : 'DAYS',
              },
              {
                value: `$${(expedition.raised ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                label: 'RAISED',
              },
              { value: String(expedition.sponsorsCount ?? 0), label: 'SPONSORS' },
              { value: String(expedition.entriesCount ?? 0), label: 'ENTRIES' },
            ]}
          />
        </View>

        {sponsorable && (
          <View style={[styles.fundingWrap, { borderTopColor: colors.borderThin }]}>
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
  body: { padding: 14 },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 21 },
  description: { fontSize: 13, lineHeight: 18, marginTop: 6 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  authorName: { fontSize: 12, color: brandColors.copper, fontWeight: '600' },
  statsWrap: { borderTopWidth: borders.thick },
  fundingWrap: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: borders.thin },
});
