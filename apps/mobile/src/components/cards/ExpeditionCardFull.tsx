import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { Avatar } from '@/components/ui/Avatar';
import { StatsBar } from '@/components/ui/StatsBar';
import { FundingBar } from '@/components/ui/FundingBar';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';
import { fmtAmount } from '@/utils/formatAmount';

interface ExpeditionCardFullProps {
  expedition: Expedition;
  onPress: () => void;
}

export function ExpeditionCardFull({ expedition, onPress }: ExpeditionCardFullProps) {
  const { colors } = useTheme();

  const now = Date.now();
  const startMs = expedition.startDate ? new Date(expedition.startDate).getTime() : null;
  const endMs = expedition.endDate ? new Date(expedition.endDate).getTime() : null;
  const totalPlannedDays = startMs && endMs ? Math.max(1, Math.ceil((endMs - startMs) / 86400000)) : null;

  const dateStat = (() => {
    if (expedition.status === 'completed') {
      return { label: 'DURATION', value: totalPlannedDays ? `${totalPlannedDays}d` : '\u2014' };
    }
    if (expedition.status === 'active') {
      const daysActive = startMs ? Math.max(1, Math.ceil((now - startMs) / 86400000)) : 0;
      return { label: 'DAYS ACTIVE', value: String(daysActive) };
    }
    // planned
    const startsIn = startMs ? Math.max(0, Math.ceil((startMs - now) / 86400000)) : null;
    return { label: 'STARTS IN', value: startsIn != null ? `${startsIn}d` : 'TBD' };
  })();

  const sponsorable =
    expedition.author?.creator &&
    expedition.author?.stripeAccountConnected &&
    (expedition.goal ?? 0) > 0;

  const totalRaised = (expedition.raised ?? 0) + (expedition.recurringStats?.totalCommitted ?? 0);

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : '';

  const dateRange = expedition.startDate
    ? `${fmtDate(expedition.startDate)} \u2192 ${expedition.endDate ? fmtDate(expedition.endDate) : 'ONGOING'}`
    : '';

  const rightLabel = expedition.category?.toUpperCase()
    || (expedition.visibility && expedition.visibility !== 'public'
      ? expedition.visibility.toUpperCase()
      : undefined);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${expedition.title} expedition`} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <HCard>
        <StatusHeader
          status={expedition.status}
          label={`${expedition.status.toUpperCase()} EXPEDITION`}
          dotColor={expedition.status === 'active' ? brandColors.copper : undefined}
          right={rightLabel}
        />
        <View style={styles.heroWrap}>
          {expedition.coverImage ? (
            <Image source={{ uri: expedition.coverImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a2332' }]} />
          )}
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {expedition.title}
            </Text>
            {dateRange !== '' && (
              <Text style={styles.heroDate}>{dateRange}</Text>
            )}
            {expedition.region && (
              <Text style={styles.heroRegion}>
                {expedition.region.toUpperCase()}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.body}>
          {expedition.author && (
            <View style={styles.authorRow}>
              <Avatar size={20} name={expedition.author.username} imageUrl={expedition.author.picture} pro={expedition.author.creator} />
              <Text style={styles.authorName}>
                {expedition.author.username}
              </Text>
            </View>
          )}
          {expedition.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
              {expedition.description}
            </Text>
          )}
        </View>

        <View style={[styles.statsWrap, { borderTopColor: colors.border }]}>
          <StatsBar
            stats={[
              {
                value: dateStat.value,
                label: dateStat.label,
              },
              ...(sponsorable ? [{
                value: fmtAmount(totalRaised),
                suffix: `/${fmtAmount(expedition.goal!)}`,
                label: 'RAISED',
              }] : []),
              ...(sponsorable ? [{ value: String(expedition.sponsorsCount ?? 0), label: 'SPONSORS' }] : []),
              { value: String(expedition.entriesCount ?? 0), label: 'ENTRIES' },
            ]}
          />
        </View>

        {sponsorable && (
          <View style={[styles.fundingWrap, { borderTopColor: colors.borderThin }]}>
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
  heroWrap: {
    height: 190,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  heroContent: {
    padding: 14,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    color: '#fff',
  },
  heroDate: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    marginTop: 6,
  },
  heroRegion: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  body: { padding: 14 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontSize: 12, color: brandColors.copper, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  statsWrap: { borderTopWidth: borders.thick },
  fundingWrap: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: borders.thin },
});
