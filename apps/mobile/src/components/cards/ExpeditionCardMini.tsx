import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { HCard } from '@/components/ui/HCard';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { CoverImage } from '@/components/ui/CoverImage';
import { FundingBar } from '@/components/ui/FundingBar';
import { useHeimuMap } from '@/hooks/useHeimuMap';
import type { WaypointMarker } from '@/components/map/HeimuMap';
import { mono, colors as brandColors, borders, ROUTE_MODE_STYLES } from '@/theme/tokens';
import type { Expedition } from '@/types/api';
import { StarRating } from '@/components/ui/StarRating';
import { fmtAmount } from '@/utils/formatAmount';

interface ExpeditionCardMiniProps {
  expedition: Expedition;
  onPress: () => void;
}

export function ExpeditionCardMini({ expedition, onPress }: ExpeditionCardMiniProps) {
  const { colors } = useTheme();
  const isBlueprint = !!expedition.isBlueprint;
  const MapComponent = useHeimuMap(isBlueprint ? 100 : 99999);

  const now = Date.now();
  const startMs = expedition.startDate ? new Date(expedition.startDate).getTime() : null;
  const endMs = expedition.endDate ? new Date(expedition.endDate).getTime() : null;

  const headerRight = expedition.mode?.toUpperCase()
    || expedition.category?.toUpperCase();

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
          label={isBlueprint ? 'EXPEDITION BLUEPRINT' : `${expedition.status.toUpperCase()} EXPEDITION`}
          dotColor={isBlueprint ? brandColors.green : expedition.status === 'active' ? brandColors.copper : undefined}
          right={headerRight}
        />
        <View style={styles.body}>
          <View style={styles.imageWrap}>
            {isBlueprint && MapComponent && (expedition.waypoints ?? []).length > 0 ? (() => {
              const wps = (expedition.waypoints ?? []).filter(w => w.lat != null && w.lon != null).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
              const routeCoords: [number, number][] = wps.map(w => [w.lon!, w.lat!]);
              const routeStyle = ROUTE_MODE_STYLES[expedition.routeMode ?? 'straight'] ?? ROUTE_MODE_STYLES.straight;
              const markers: WaypointMarker[] = wps.map((w, i) => ({
                coordinates: [w.lon!, w.lat!] as [number, number],
                type: i === 0 ? 'origin' : i === wps.length - 1 ? 'destination' : 'waypoint',
                text: i === 0 ? 'S' : i === wps.length - 1 ? 'E' : String(i),
              }));
              const lats = wps.map(w => w.lat!);
              const lons = wps.map(w => w.lon!);
              const bounds = {
                ne: [Math.max(...lons), Math.max(...lats)] as [number, number],
                sw: [Math.min(...lons), Math.min(...lats)] as [number, number],
                padding: 20,
              };
              return (
                <MapComponent
                  style={{ flex: 1 }}
                  bounds={bounds}
                  routeCoords={routeCoords.length > 1 ? routeCoords : undefined}
                  routeColor={routeStyle.color}
                  waypoints={markers}
                  interactive={false}
                />
              );
            })() : (
              <CoverImage uri={expedition.coverImage} height="100%" />
            )}
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {expedition.title}
            </Text>
            {expedition.author && (
              <Text style={[styles.authorName, isBlueprint && { color: brandColors.green }]} numberOfLines={1}>
                {expedition.author.username}
              </Text>
            )}
            <Text style={[styles.meta, { color: colors.textTertiary }]} numberOfLines={1}>
              {(expedition.locationName || expedition.region)?.toUpperCase() || dateRange || ''}
            </Text>
            <View style={styles.statsRow}>
              {isBlueprint ? (
                <>
                  {(expedition.estimatedDurationH ?? 0) > 0 && (
                    <Text style={[styles.stat, { color: colors.textTertiary }]}>
                      {expedition.estimatedDurationH! >= 24
                        ? `${Math.round(expedition.estimatedDurationH! / 24)}d`
                        : `${Math.round(expedition.estimatedDurationH!)}h`}
                    </Text>
                  )}
                  {((expedition.totalDistanceKm || expedition.routeDistanceKm) ?? 0) > 0 && (
                    <Text style={[styles.stat, { color: colors.textTertiary }]}>
                      {Math.round((expedition.totalDistanceKm || expedition.routeDistanceKm)!)} km
                    </Text>
                  )}
                  {expedition.elevationMinM != null && expedition.elevationMaxM != null && (
                    <Text style={[styles.stat, { color: colors.textTertiary }]}>
                      {Math.round(expedition.elevationMinM)}-{Math.round(expedition.elevationMaxM)}m
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text style={[styles.stat, { color: brandColors.blue }]}>
                    {expedition.entriesCount ?? 0} entries
                  </Text>
                  {((expedition.totalDistanceKm || expedition.routeDistanceKm) ?? 0) > 0 && (
                    <Text style={[styles.stat, { color: colors.textTertiary }]}>
                      {Math.round((expedition.totalDistanceKm || expedition.routeDistanceKm)!)} km
                    </Text>
                  )}
                  {sponsorable && (
                    <Text style={[styles.stat, { color: brandColors.copper }]}>
                      {fmtAmount(totalRaised)}
                      <Text style={{ color: colors.textTertiary }}>
                        /{fmtAmount(expedition.goal!)}
                      </Text>
                      {' raised'}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>
        </View>
        {!isBlueprint && sponsorable && (
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
    flexWrap: 'wrap',
    gap: 10,
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
