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
import { fmtAmount } from '@/utils/formatAmount';

interface ExpeditionListItemProps {
  expedition: Expedition;
}

export function ExpeditionListItem({ expedition }: ExpeditionListItemProps) {
  const { dark, colors } = useTheme();
  const router = useRouter();

  const now = Date.now();
  const startMs = expedition.startDate ? new Date(expedition.startDate).getTime() : null;
  const endMs = expedition.endDate ? new Date(expedition.endDate).getTime() : null;

  const headerRight = (() => {
    if (expedition.status === 'active' && startMs) {
      return `DAY ${Math.max(1, Math.ceil((now - startMs) / 86400000))}`;
    }
    if (expedition.status === 'planned' && startMs) {
      return `IN ${Math.max(0, Math.ceil((startMs - now) / 86400000))}d`;
    }
    if (expedition.status === 'completed' && startMs && endMs) {
      return `${Math.max(1, Math.ceil((endMs - startMs) / 86400000))}d`;
    }
    return expedition.category?.toUpperCase();
  })();

  const totalRaised = (expedition.raised ?? 0) + (expedition.recurringStats?.totalCommitted ?? 0);

  return (
    <TouchableOpacity onPress={() => router.push(`/expedition/${expedition.id}`)}>
      <HCard>
        <StatusHeader
          status={expedition.status}
          label="EXPEDITION"
          right={headerRight
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
                {(expedition.locationName || expedition.region) ? ` · ${(expedition.locationName || expedition.region)!.toUpperCase()}` : ''}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={[styles.stat, { color: brandColors.blue }]}>
                {expedition.entriesCount ?? 0} entries
              </Text>
              {(expedition.goal ?? 0) > 0 && (
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
        {expedition.goal && expedition.goal > 0 && (
          <View style={[styles.fundingWrap, { borderTopColor: colors.border }]}>
            <FundingBar
              raised={totalRaised}
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
