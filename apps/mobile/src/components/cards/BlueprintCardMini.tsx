import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { CoverImage } from '@/components/ui/CoverImage';
import { StarRating } from '@/components/ui/StarRating';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';

interface BlueprintCardMiniProps {
  blueprint: Expedition;
  onPress: () => void;
}

export function BlueprintCardMini({ blueprint, onPress }: BlueprintCardMiniProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Blueprint: ${blueprint.title}`}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
    >
      <HCard>
        <StatusHeader
          status="active"
          label="EXPEDITION BLUEPRINT"
          dotColor={brandColors.green}
          right={blueprint.mode?.toUpperCase()}
        />
        <View style={styles.body}>
          <View style={styles.imageWrap}>
            <CoverImage uri={blueprint.coverImage} height="100%" />
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {blueprint.title}
            </Text>
            {blueprint.author && (
              <Text style={styles.guideName} numberOfLines={1}>
                {blueprint.author.username}
              </Text>
            )}
            {(blueprint.locationName || blueprint.region) && (
              <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
                {(blueprint.locationName || blueprint.region)!.toUpperCase()}
              </Text>
            )}
            <View style={styles.statsRow}>
              {(blueprint.averageRating ?? 0) > 0 ? (
                <View style={styles.ratingWrap}>
                  <StarRating rating={blueprint.averageRating ?? 0} size={12} />
                  <Text style={[styles.stat, { color: colors.textTertiary }]}>
                    ({blueprint.ratingsCount ?? 0})
                  </Text>
                </View>
              ) : (
                <Text style={[styles.stat, { color: colors.textTertiary }]}>No reviews</Text>
              )}
              <Text style={[styles.stat, { color: brandColors.green }]}>
                {blueprint.adoptionsCount ?? 0} launches
              </Text>
              {(blueprint.waypointsCount ?? 0) > 0 && (
                <Text style={[styles.stat, { color: colors.textTertiary }]}>
                  {blueprint.waypointsCount} wpts
                </Text>
              )}
              {((blueprint.totalDistanceKm || blueprint.routeDistanceKm) ?? 0) > 0 && (
                <Text style={[styles.stat, { color: colors.textTertiary }]}>
                  {Math.round((blueprint.totalDistanceKm || blueprint.routeDistanceKm)!)} km
                </Text>
              )}
            </View>
          </View>
        </View>
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
  guideName: {
    fontSize: 12,
    color: brandColors.green,
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
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stat: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
});
