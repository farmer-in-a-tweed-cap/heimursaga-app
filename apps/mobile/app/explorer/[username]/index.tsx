import React, { useState, useEffect, ComponentType } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert } from 'react-native';
// SafeAreaView no longer needed – NavBar handles top inset
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { bookmarksApi } from '@/services/api';
import { NavBar } from '@/components/ui/NavBar';
import { ProfileBanner } from '@/components/profile/ProfileBanner';
import { ExpeditionCardMini } from '@/components/cards/ExpeditionCardMini';
import { EntryCardFull } from '@/components/cards/EntryCardFull';
import { StatsBar } from '@/components/ui/StatsBar';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { HCard } from '@/components/ui/HCard';
import { Svg, Path } from 'react-native-svg';
import type { HeimuMapProps, WaypointMarker } from '@/components/map/HeimuMap';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import { getExplorerStatus, explorerStatusConfig } from '@/utils/explorerStatus';
import type { ExplorerProfile, Expedition, Entry } from '@/types/api';

export default function ExplorerProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  const { data: profile, loading } = useApi<ExplorerProfile>(
    username ? `/users/${username}` : null,
  );
  const { data: tripsData } = useApi<{ data: Expedition[]; results: number }>(
    username ? `/users/${username}/trips` : null,
  );
  const { data: postsData } = useApi<{ data: Entry[]; results: number }>(
    username ? `/users/${username}/posts` : null,
  );

  const expeditions = tripsData?.data ?? [];
  const entries = postsData?.data ?? [];

  useEffect(() => {
    if (profile?.bookmarked != null) setBookmarked(profile.bookmarked);
  }, [profile?.bookmarked]);

  const handleShare = () => {
    Share.share({ url: `https://heimursaga.com/explorer/${username}` });
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (bookmarkLoading || !username) return;
    setBookmarkLoading(true);
    setBookmarked(prev => !prev);
    try {
      await bookmarksApi.toggleExplorer(username);
    } catch {
      setBookmarked(prev => !prev);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);

  // Defer MapboxGL import to avoid blocking the JS thread
  const [MapComponent, setMapComponent] = useState<ComponentType<HeimuMapProps> | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/components/map/HeimuMap').then((mod) => setMapComponent(() => mod.default));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  // Compute explorer status
  const explorerStatus = getExplorerStatus(
    tripsData?.data ?? profile.recentExpeditions ?? [],
    profile.activeExpeditionOffGrid,
  );
  const statusCfg = explorerStatusConfig[explorerStatus];

  const memberSince = profile.memberDate
    ? new Date(profile.memberDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground topOffset={headerHeight} />
      <View onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <NavBar onBack={() => router.back()} />
      </View>

      <ScrollView>
        <ProfileBanner
          username={profile.username}
          displayName={profile.name}
          bio={profile.bio}
          location={profile.locationFrom || profile.locationLives}
          memberSince={memberSince}
          isPro={profile.creator}
          avatarUrl={profile.picture}
          coverPhotoUrl={profile.coverPhoto}
          activeExpedition={profile.activeExpeditionLocation?.expeditionTitle}
          statusLabel={statusCfg.label}
          statusColor={statusCfg.color}
        />

        {/* Stats bar */}
        <View style={[styles.statsWrap, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <StatsBar
            stats={[
              { value: String(profile.expeditionsCount ?? 0), label: 'EXPED.' },
              { value: String(profile.entriesCount ?? 0), label: 'ENTRIES' },
            ]}
          />
        </View>

        {/* Action bar */}
        <View style={[styles.actionBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity style={[styles.actionBtn, { borderRightColor: colors.borderThin }]}>
            <Text style={[styles.actionText, { color: brandColors.blue }]}>FOLLOW</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderRightColor: colors.borderThin }]}
            onPress={() => {
              const expId = profile.activeExpeditionLocation?.expeditionId;
              if (expId) {
                router.push(`/sponsor/${expId}`);
              } else {
                Alert.alert('No active expedition', 'This explorer does not have an active expedition to sponsor.');
              }
            }}
          >
            <Text style={[styles.actionText, { color: brandColors.copper }]}>SPONSOR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { borderRightColor: colors.borderThin }]} onPress={handleShare}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
              <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
            </Svg>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleBookmark}>
            <Svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill={bookmarked ? brandColors.copper : 'none'}
              stroke={bookmarked ? brandColors.copper : colors.textTertiary}
              strokeWidth={2}
            >
              <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Entry map */}
        {(() => {
          const geoEntries = entries.filter(e => e.lat != null && e.lon != null);
          return (
            <View style={styles.mapWrap}>
              {MapComponent && (
                <>
                  <MapComponent
                    style={{ height: mapExpanded ? 400 : 160 }}
                    center={
                      geoEntries.length > 0
                        ? [geoEntries[0].lon!, geoEntries[0].lat!]
                        : [0, 20]
                    }
                    zoom={geoEntries.length > 0 ? 3 : 1}
                    waypoints={geoEntries.map((e): WaypointMarker => ({
                      coordinates: [e.lon!, e.lat!],
                      type: 'waypoint',
                      label: e.place,
                    }))}
                    interactive={mapExpanded}
                    onWaypointPress={mapExpanded ? (i) => { const e = geoEntries[i]; if (e) setSelectedEntry(e); } : undefined}
                  />
                  {selectedEntry && mapExpanded && (
                    <View style={[styles.popupWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={styles.popupHeader}>
                        <Text style={[styles.popupTitle, { color: colors.text }]} numberOfLines={1}>
                          {selectedEntry.title}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedEntry(null)} hitSlop={8}>
                          <Text style={[styles.popupClose, { color: colors.textTertiary }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      {selectedEntry.place && (
                        <Text style={[styles.popupPlace, { color: colors.textSecondary }]} numberOfLines={1}>
                          {selectedEntry.place}
                        </Text>
                      )}
                      {selectedEntry.date && (
                        <Text style={[styles.popupDate, { color: colors.textTertiary }]}>
                          {new Date(selectedEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      )}
                      <TouchableOpacity
                        style={styles.popupBtn}
                        onPress={() => { setSelectedEntry(null); router.push(`/entry/${selectedEntry.id}`); }}
                      >
                        <Text style={styles.popupBtnText}>VIEW ENTRY</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <View style={styles.mapOverlay}>
                    <Text style={styles.mapLabel}>ENTRY MAP</Text>
                    <TouchableOpacity style={styles.expandBtn} onPress={() => { setMapExpanded(v => !v); setSelectedEntry(null); }}>
                      <Text style={styles.expandText}>{mapExpanded ? 'COLLAPSE' : 'EXPAND'}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          );
        })()}

        {/* Recent Expeditions */}
        {expeditions.length > 0 && (
          <>
            <SectionDivider title="RECENT EXPEDITIONS" action="VIEW ALL" onAction={() => router.push(`/explorer/${username}/expeditions`)} />
            <View style={styles.sectionContent}>
              {expeditions.slice(0, 2).map((exp) => (
                <ExpeditionCardMini
                  key={exp.id}
                  expedition={exp}
                  onPress={() => router.push(`/expedition/${exp.id}`)}
                />
              ))}
            </View>
          </>
        )}

        {/* Recent Entries */}
        {entries.length > 0 && (
          <>
            <SectionDivider title="RECENT JOURNAL ENTRIES" action="VIEW ALL" onAction={() => router.push(`/explorer/${username}/entries`)} />
            <View style={styles.sectionContent}>
              {entries.slice(0, 2).map((entry) => (
                <EntryCardFull
                  key={entry.id}
                  entry={entry}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                  showAuthor={false}
                />
              ))}
            </View>
          </>
        )}

        {/* Biography */}
        {profile.bio && (
          <>
            <SectionDivider title="BIOGRAPHY" />
            <View style={styles.sectionContent}>
              <HCard>
                <View style={styles.bioCard}>
                  <Text style={[styles.bioText, { color: colors.textSecondary }]}>
                    {profile.bio}
                  </Text>
                </View>
              </HCard>
            </View>
          </>
        )}

        {/* Links */}
        {(() => {
          const links = [
            profile.website && { label: 'Website', value: profile.website },
            profile.twitter && { label: 'Twitter', value: profile.twitter },
            profile.instagram && { label: 'Instagram', value: profile.instagram },
            profile.youtube && { label: 'YouTube', value: profile.youtube },
            profile.portfolio && { label: 'Portfolio', value: profile.portfolio },
          ].filter(Boolean) as { label: string; value: string }[];
          if (links.length === 0) return null;
          return (
            <>
              <SectionDivider title="LINKS" />
              <View style={styles.sectionContent}>
                <HCard>
                  {links.map((link, i) => (
                    <View
                      key={link.label}
                      style={[
                        styles.linkItem,
                        i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                      ]}
                    >
                      <Text style={styles.linkLabel}>{link.label}</Text>
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                        <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                      </Svg>
                    </View>
                  ))}
                </HCard>
              </View>
            </>
          );
        })()}

        {/* Equipment */}
        {profile.equipment && profile.equipment.length > 0 && (
          <>
            <SectionDivider title="EQUIPMENT" />
            <View style={styles.sectionContent}>
              <HCard>
                <View style={styles.countryWrap}>
                  <View style={styles.countryChips}>
                    {profile.equipment.map((item) => (
                      <View key={item} style={[styles.chip, { borderColor: colors.borderThin }]}>
                        <Text style={[styles.chipText, { color: colors.textSecondary }]}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </HCard>
            </View>
          </>
        )}

        {/* System info */}
        <SectionDivider title="SYSTEM INFORMATION" />
        <View style={styles.sectionContent}>
          <HCard>
            {[
              { label: 'Account Type', value: profile.creator ? 'Creator' : 'Explorer' },
              { label: 'Member Since', value: memberSince ?? 'Unknown' },
              ...(profile.isPioneer ? [{ label: 'Status', value: 'Pioneer' }] : []),
            ].map((item, i) => (
              <View
                key={item.label}
                style={[
                  styles.sysRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                ]}
              >
                <Text style={[styles.sysLabel, { color: colors.textTertiary }]}>{item.label}</Text>
                <Text style={[styles.sysValue, { color: colors.textSecondary }]}>{item.value}</Text>
              </View>
            ))}
          </HCard>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  statsWrap: {
    borderTopWidth: borders.thick,
    borderBottomWidth: borders.thick,
  },
  actionBar: {
    flexDirection: 'row',
    borderBottomWidth: borders.thick,
  },
  actionBtn: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRightWidth: 1,
  },
  actionText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  iconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  mapWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: borders.thick,
    overflow: 'hidden',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(32,32,32,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.8,
  },
  expandBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  expandText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.6,
  },
  popupWrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    borderWidth: borders.thick,
    padding: 10,
    zIndex: 10,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  popupTitle: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  popupClose: {
    fontSize: 14,
    fontWeight: '600',
  },
  popupPlace: {
    fontFamily: mono,
    fontSize: 12,
    marginTop: 2,
  },
  popupDate: {
    fontFamily: mono,
    fontSize: 11,
    marginTop: 2,
  },
  popupBtn: {
    marginTop: 8,
    backgroundColor: brandColors.copper,
    paddingVertical: 10,
    alignItems: 'center',
  },
  popupBtnText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.6,
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  bioCard: {
    padding: 12,
    paddingHorizontal: 14,
  },
  bioText: {
    fontSize: 13,
    lineHeight: 21,
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 14,
  },
  linkLabel: {
    fontSize: 12,
    color: brandColors.blue,
    fontWeight: '600',
  },
  countryWrap: {
    padding: 10,
    paddingHorizontal: 14,
  },
  countryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  sysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    paddingHorizontal: 14,
  },
  sysLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sysValue: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
  },
  spacer: { height: 32 },
});
