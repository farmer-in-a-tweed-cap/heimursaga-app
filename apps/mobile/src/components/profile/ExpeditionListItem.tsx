import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { FundingBar } from '@/components/ui/FundingBar';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';

interface ExpeditionListItemProps {
  expedition: Expedition;
}

export function ExpeditionListItem({ expedition }: ExpeditionListItemProps) {
  const { dark, colors } = useTheme();
  const router = useRouter();

  const dayCount = expedition.startDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(expedition.startDate).getTime()) / 86400000))
    : undefined;

  return (
    <TouchableOpacity onPress={() => router.push(`/expedition/${expedition.id}`)}>
      <HCard>
        <StatusHeader
          status={expedition.status}
          label="EXPEDITION"
          right={
            expedition.status === 'active' && dayCount
              ? `DAY ${dayCount}`
              : expedition.category?.toUpperCase()
          }
        />
        <View style={styles.body}>
          <View style={styles.imageWrap}>
            <ImagePlaceholder height={80} />
          </View>
          <View style={styles.info}>
            <View>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {expedition.title}
              </Text>
              <Text style={[styles.meta, { color: colors.textTertiary }]}>
                {expedition.category?.toUpperCase()}
                {expedition.region ? ` · ${expedition.region.toUpperCase()}` : ''}
              </Text>
            </View>
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
        {expedition.goal && expedition.goal > 0 && (
          <View style={[styles.fundingWrap, { borderTopColor: colors.border }]}>
            <FundingBar
              raised={expedition.raised ?? 0}
              goal={expedition.goal}
            />
          </View>
        )}
      </HCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
  },
  imageWrap: {
    width: 90,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    padding: 10,
    paddingLeft: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 19,
  },
  meta: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  stat: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  fundingWrap: {
    borderTopWidth: borders.thick,
  },
});
