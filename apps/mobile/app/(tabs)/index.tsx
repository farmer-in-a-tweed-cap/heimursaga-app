import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { notificationsApi } from '@/services/api';
import { colors as brandColors, mono, borders } from '@/theme/tokens';
import { Svg, Path, Circle } from 'react-native-svg';
import { HCard } from '@/components/ui/HCard';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { StatsBar } from '@/components/ui/StatsBar';
import { Avatar } from '@/components/ui/Avatar';
import { SectionDivider } from '@/components/ui/SectionDivider';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { HeimuMapProps, HeimuMapRef, WaypointMarker } from '@/components/map/HeimuMap';
import { clusterMarkers, getClusterExpansionZoom, spreadCoincidentMarkers } from '@/components/map/HeimuMap';
import { getExplorerStatus, explorerStatusConfig } from '@/utils/explorerStatus';
import { ExpeditionCardFull } from '@/components/cards/ExpeditionCardFull';
import { ExplorerCardMini } from '@/components/cards/ExplorerCardMini';
import { EntryCardFull } from '@/components/cards/EntryCardFull';
import type { ApiResponse, Expedition, ExplorerProfile, Entry } from '@/types/api';

interface TripsResponse {
  data: Expedition[];
  results?: number;
}

export default function HomeScreen() {
  const { dark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const [feedTab, setFeedTabRaw] = useState(0);
  const setFeedTab = useCallback((tab: number) => {
    setFeedTabRaw(tab);
    SecureStore.setItemAsync('heimursaga_feed_tab', String(tab)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!user) return;
    SecureStore.getItemAsync('heimursaga_feed_tab').then((val) => {
      if (val === '1') setFeedTabRaw(1);
    }).catch(() => {});
  }, [user]);
  const [atlasTab, setAtlasTab] = useState(0); // 0 = EXPLORERS, 1 = ENTRIES
  const [atlasExpanded, setAtlasExpanded] = useState(false);
  const [selectedAtlasEntry, setSelectedAtlasEntry] = useState<Entry | null>(null);
  const [selectedExplorer, setSelectedExplorer] = useState<ExplorerProfile | null>(null);
  const [atlasZoom, setAtlasZoom] = useState(1.5);
  const [badgeCount, setBadgeCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const atlasMapRef = useRef<HeimuMapRef>(null);

  const handleGeolocate = useCallback(async () => {
    try {
      const Location = await import('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Access', 'Location permission is required to use this feature.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords: [number, number] = [loc.coords.longitude, loc.coords.latitude];
      atlasMapRef.current?.flyTo(coords, 8);
      if (!atlasExpanded) setAtlasExpanded(true);
    } catch {
      Alert.alert('Location Unavailable', 'Could not determine your location. Please try again.');
    }
  }, [atlasExpanded]);

  // Poll notification badge count
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const fetchBadge = () => {
      notificationsApi.getBadgeCount()
        .then((res) => { if (!cancelled) setBadgeCount(res.data.count); })
        .catch(() => {});
    };
    fetchBadge();
    const interval = setInterval(fetchBadge, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [userId]);

  // Global feed
  const { data, loading, error, refetch } = useApi<TripsResponse>('/trips');
  const allExpeditions = data?.data ?? [];
  const expeditions = allExpeditions.slice(0, 5);

  const { data: usersData } = useApi<{ data: ExplorerProfile[]; results: number }>('/users');
  const explorers = (usersData?.data ?? []).slice(0, 2);

  const { data: postsData } = useApi<{ data: Entry[]; results: number }>('/posts');
  const entries = (postsData?.data ?? []).slice(0, 2);

  // Following feed
  const { data: followTrips, loading: followLoading, refetch: refetchFollowTrips } = useApi<TripsResponse>(
    user ? '/trips?context=following' : null,
  );
  const followExpeditions = (followTrips?.data ?? []).slice(0, 5);

  const { data: followUsers, refetch: refetchFollowUsers } = useApi<{ data: ExplorerProfile[]; results: number }>(
    user ? '/users?context=following' : null,
  );
  const followExplorers = (followUsers?.data ?? []).slice(0, 4);

  const { data: followPosts, refetch: refetchFollowPosts } = useApi<{ data: Entry[]; results: number }>(
    user ? '/posts?context=following' : null,
  );
  const followEntries = (followPosts?.data ?? []).slice(0, 2);

  // Defer MapboxGL import so its native module init doesn't block the JS thread
  type HeimuMapComponent = ForwardRefExoticComponent<HeimuMapProps & RefAttributes<HeimuMapRef>>;
  const [MapComponent, setMapComponent] = useState<HeimuMapComponent | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/components/map/HeimuMap').then((mod) => setMapComponent(() => mod.default));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Count active expeditions for atlas stats
  const activeExpeditions = allExpeditions.filter((e) => e.status === 'active').length;

  // Explorer markers — activeExpeditionLocation → locationLives → locationFrom
  const geoExplorers: ExplorerProfile[] = [];
  const explorerMarkers: WaypointMarker[] = [];
  for (const e of usersData?.data ?? []) {
    let coords: [number, number] | null = null;
    if (e.activeExpeditionLocation) {
      coords = [e.activeExpeditionLocation.lon, e.activeExpeditionLocation.lat];
    } else if (e.locationLivesLat != null && e.locationLivesLon != null) {
      coords = [e.locationLivesLon, e.locationLivesLat];
    } else if (e.locationFromLat != null && e.locationFromLon != null) {
      coords = [e.locationFromLon, e.locationFromLat];
    }
    if (coords) {
      geoExplorers.push(e);
      explorerMarkers.push({ coordinates: coords, type: 'origin' as const, label: e.username });
    }
  }

  // Entry markers — only entries with coordinates
  const geoEntries = (postsData?.data ?? []).filter(e => e.lat != null && e.lon != null);
  const entryMarkers: WaypointMarker[] = geoEntries.map(e => ({
    coordinates: [e.lon!, e.lat!],
    type: 'waypoint' as const,
    label: e.place,
  }));

  const rawAtlasMarkers = atlasTab === 0 ? explorerMarkers : entryMarkers;
  const spreadMarkers = useMemo(() => spreadCoincidentMarkers(rawAtlasMarkers), [rawAtlasMarkers]);
  const atlasMarkers = useMemo(() => clusterMarkers(spreadMarkers, atlasZoom), [spreadMarkers, atlasZoom]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground topOffset={insets.top + 52} />
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Image
          source={require('../../assets/logo-lg-light.png')}
          style={{ height: 44, width: 130 }}
          resizeMode="contain"
        />
        <View style={styles.headerRight}>
          {user && <Avatar size={30} name={user.username} imageUrl={user.picture ?? user.avatar_url} pro={user.isPremium ?? user.is_pro} />}
          {user && (
            <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bellWrap} accessibilityRole="button" accessibilityLabel={`Notifications${badgeCount > 0 ? `, ${badgeCount} unread` : ''}`}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" strokeWidth={1.8}>
                <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </Svg>
              {badgeCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                </View>
              )}
            </Pressable>
          )}
          <Pressable onPress={() => router.push('/menu')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Menu">
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#e5e5e5" strokeWidth={2}>
              <Path d="M3 6h18M3 12h18M3 18h18" />
            </Svg>
          </Pressable>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            if (feedTab === 0) {
              await refetch();
            } else {
              await Promise.all([refetchFollowTrips(), refetchFollowUsers(), refetchFollowPosts()]);
            }
            setRefreshing(false);
          }} tintColor={brandColors.copper} />
        }
      >
        {/* Global / Following toggle */}
        <View style={styles.feedToggleWrap}>
          <HCard>
            <View style={styles.feedToggle}>
              <Pressable
                onPress={() => setFeedTab(0)}
                style={[
                  styles.feedToggleBtn,
                  { backgroundColor: feedTab === 0 ? brandColors.copper : 'transparent' },
                ]}
              >
                <Text style={[styles.feedToggleLabel, { color: feedTab === 0 ? '#fff' : colors.textTertiary }]}>
                  GLOBAL
                </Text>
                <Text style={[styles.feedToggleCount, { color: feedTab === 0 ? '#fff' : colors.textTertiary }]}>
                  {String(data?.results ?? 0)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!user) {
                    router.push('/(auth)/login');
                    return;
                  }
                  setFeedTab(1);
                }}
                style={[
                  styles.feedToggleBtn,
                  {
                    backgroundColor: feedTab === 1 ? brandColors.blue : 'transparent',
                    borderLeftWidth: 1,
                    borderLeftColor: colors.borderThin,
                    opacity: !user ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={[styles.feedToggleLabel, { color: feedTab === 1 ? '#fff' : colors.textTertiary }]}>
                  FOLLOWING
                </Text>
                <Text style={[styles.feedToggleCount, { color: feedTab === 1 ? '#fff' : colors.textTertiary }]}>
                  {user ? String(followUsers?.results ?? 0) : '—'}
                </Text>
              </Pressable>
            </View>
          </HCard>
        </View>

        {/* Explorer Atlas */}
        <View style={styles.atlasWrap}>
          <View style={[styles.atlasCard, { borderWidth: borders.thick, borderColor: colors.border }]}>
            <View style={[styles.atlasMap, { height: atlasExpanded ? 400 : 200 }]}>
              {MapComponent && (
                <MapComponent
                  ref={atlasMapRef}
                  style={StyleSheet.absoluteFillObject}
                  center={[-98, 40]}
                  zoom={1.5}
                  waypoints={atlasMarkers}
                  interactive={atlasExpanded}
                  onZoomChange={setAtlasZoom}
                  onWaypointPress={atlasExpanded ? (i) => {
                    const marker = atlasMarkers[i];
                    if (!marker) return;
                    // Cluster tap — zoom to the level where markers separate
                    if (marker.clusterSize && marker.clusterSize > 1 && marker.clusterCoords) {
                      const expansionZoom = getClusterExpansionZoom(marker.clusterCoords);
                      setAtlasZoom(expansionZoom);
                      atlasMapRef.current?.fitBounds(marker.clusterCoords);
                      return;
                    }
                    if (atlasTab === 0) {
                      const explorer = geoExplorers.find(e => e.username === marker.label);
                      if (!explorer) return;
                      setSelectedExplorer(explorer);
                      setSelectedAtlasEntry(null);
                    } else {
                      const entry = geoEntries.find(e => e.place === marker.label);
                      if (!entry) return;
                      setSelectedAtlasEntry(entry);
                      setSelectedExplorer(null);
                    }
                  } : undefined}
                />
              )}
              {/* Explorer popup */}
              {selectedExplorer && atlasExpanded && (
                <View style={[styles.popupWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.popupHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <Avatar size={32} name={selectedExplorer.username} imageUrl={selectedExplorer.picture} pro={selectedExplorer.creator} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.popupTitle, { color: colors.text }]} numberOfLines={1}>
                          {selectedExplorer.username}
                        </Text>
                        {selectedExplorer.name && (
                          <Text style={[styles.popupPlace, { color: colors.textSecondary, marginTop: 1 }]} numberOfLines={1}>
                            {selectedExplorer.name}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedExplorer(null)} hitSlop={8}>
                      <Text style={[styles.popupClose, { color: colors.textTertiary }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {(() => {
                    const st = getExplorerStatus(selectedExplorer.recentExpeditions ?? [], selectedExplorer.activeExpeditionOffGrid);
                    const cfg = explorerStatusConfig[st];
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.color }} />
                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: cfg.color, fontFamily: mono }}>{cfg.label}</Text>
                      </View>
                    );
                  })()}
                  {selectedExplorer.activeExpeditionLocation && (
                    <>
                      <Text style={[styles.popupPlace, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                        {selectedExplorer.activeExpeditionLocation.expeditionTitle}
                      </Text>
                      <Text style={[styles.popupDate, { color: colors.textTertiary }]}>
                        {selectedExplorer.activeExpeditionLocation.name}
                      </Text>
                    </>
                  )}
                  <TouchableOpacity
                    style={styles.popupBtn}
                    onPress={() => { setSelectedExplorer(null); router.push(`/explorer/${selectedExplorer.username}`); }}
                  >
                    <Text style={styles.popupBtnText}>VIEW JOURNAL</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* Entry popup */}
              {selectedAtlasEntry && atlasExpanded && (
                <View style={[styles.popupWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.popupHeader}>
                    <Text style={[styles.popupTitle, { color: colors.text }]} numberOfLines={1}>
                      {selectedAtlasEntry.title}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedAtlasEntry(null)} hitSlop={8}>
                      <Text style={[styles.popupClose, { color: colors.textTertiary }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {selectedAtlasEntry.place && (
                    <Text style={[styles.popupPlace, { color: colors.textSecondary }]} numberOfLines={1}>
                      {selectedAtlasEntry.place}
                    </Text>
                  )}
                  {selectedAtlasEntry.date && (
                    <Text style={[styles.popupDate, { color: colors.textTertiary }]}>
                      {new Date(selectedAtlasEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.popupBtn}
                    onPress={() => { setSelectedAtlasEntry(null); router.push(`/entry/${selectedAtlasEntry.id}`); }}
                  >
                    <Text style={styles.popupBtnText}>VIEW ENTRY</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.atlasOverlay} pointerEvents="box-none">
                <Text style={styles.atlasTitle}>THE EXPLORER ATLAS</Text>
                <View style={styles.atlasOverlayRight}>
                  <Pressable style={styles.atlasExpandBtn} onPress={handleGeolocate}>
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                      <Circle cx={12} cy={12} r={3} />
                      <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    </Svg>
                    <Text style={styles.atlasExpandText}>LOCATE</Text>
                  </Pressable>
                  <Pressable
                    style={styles.atlasExpandBtn}
                    onPress={() => { setAtlasExpanded(v => !v); setSelectedExplorer(null); setSelectedAtlasEntry(null); }}
                  >
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                      <Path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                    </Svg>
                    <Text style={styles.atlasExpandText}>{atlasExpanded ? 'COLLAPSE' : 'EXPAND'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            {/* Toggle bar */}
            <View style={[styles.atlasToggleBar, { backgroundColor: brandColors.darkGray, borderTopWidth: borders.thick, borderTopColor: colors.border }]}>
              <View style={styles.atlasToggleBtnWrap}>
                {['EXPLORERS', 'ENTRIES'].map((label, i) => (
                  <Pressable
                    key={label}
                    onPress={() => { setAtlasTab(i); setSelectedExplorer(null); setSelectedAtlasEntry(null); }}
                    style={[
                      styles.atlasToggleBtn,
                      {
                        backgroundColor: atlasTab === i ? 'rgba(172,109,70,0.8)' : 'transparent',
                        borderColor: atlasTab === i ? 'rgba(172,109,70,0.6)' : 'rgba(255,255,255,0.15)',
                        borderLeftWidth: i > 0 ? 0 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.atlasToggleBtnText, { color: atlasTab === i ? '#fff' : 'rgba(255,255,255,0.4)' }]}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.atlasToggleCount}>
                {atlasTab === 0
                  ? `${usersData?.results ?? 0} explorers`
                  : `${postsData?.results ?? 0} entries`}
              </Text>
            </View>
            <View style={[styles.atlasStatsRow, { borderTopWidth: borders.thick, borderTopColor: colors.border }]}>
              <StatsBar
                stats={[
                  { value: String(activeExpeditions), label: 'ACTIVE' },
                  { value: String(usersData?.results ?? 0), label: 'EXPLORERS' },
                  { value: String(postsData?.results ?? 0), label: 'ENTRIES' },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Following empty state */}
        {feedTab === 1 && !followLoading && followExpeditions.length === 0 && followEntries.length === 0 && followExplorers.length === 0 && (
          <View style={styles.sectionContent}>
            <HCard>
              <View style={styles.followingEmpty}>
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={brandColors.blue} strokeWidth={1.5}>
                  <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <Circle cx={9} cy={7} r={4} />
                  <Path d="M19 8v6M22 11h-6" />
                </Svg>
                <Text style={[styles.followingEmptyTitle, { color: colors.text }]}>No Explorers Followed Yet</Text>
                <Text style={[styles.followingEmptyDesc, { color: colors.textTertiary }]}>
                  Follow explorers to see their expeditions, entries, and updates here.
                </Text>
                <Pressable
                  style={[styles.followingEmptyBtn, { backgroundColor: brandColors.blue }]}
                  onPress={() => { setFeedTab(0); }}
                >
                  <Text style={styles.followingEmptyBtnText}>BROWSE GLOBAL</Text>
                </Pressable>
              </View>
            </HCard>
          </View>
        )}

        {/* Expeditions */}
        <SectionDivider title="EXPEDITIONS" action={feedTab === 0 ? 'VIEW ALL' : undefined} onAction={feedTab === 0 ? () => router.push('/discover?tab=0') : undefined} />
        <View style={styles.sectionContent}>
          {(() => {
            const exps = feedTab === 0 ? expeditions : followExpeditions;
            const isLoading = feedTab === 0 ? loading : followLoading;
            if (isLoading && exps.length === 0) {
              return <ActivityIndicator color={brandColors.copper} size="large" style={styles.sectionLoader} />;
            }
            if (feedTab === 0 && error) {
              return (
                <View style={styles.centered}>
                  <Text style={[styles.errorText, { color: colors.textTertiary }]}>Could not load expeditions</Text>
                  <Pressable onPress={refetch}><Text style={styles.retryText}>Retry</Text></Pressable>
                </View>
              );
            }
            if (exps.length === 0) {
              return (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  {feedTab === 0 ? 'No expeditions found' : 'No expeditions from explorers you follow'}
                </Text>
              );
            }
            return exps.map((item) => (
              <ExpeditionCardFull key={item.id} expedition={item} onPress={() => router.push(`/expedition/${item.id}`)} />
            ));
          })()}
        </View>

        {/* Explorers */}
        {feedTab === 0 ? (
          <>
            <SectionDivider title="EXPLORERS" action="VIEW ALL" onAction={() => router.push('/discover?tab=1')} />
            <View style={styles.sectionContent}>
              <View style={styles.explorerGrid}>
                {explorers.map((explorer) => (
                  <ExplorerCardMini
                    key={explorer.username}
                    explorer={explorer}
                    onPress={() => router.push(`/explorer/${explorer.username}`)}
                  />
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <SectionDivider title="FOLLOWED EXPLORERS" />
            <View style={styles.sectionContent}>
              {followExplorers.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No followed explorers yet
                </Text>
              ) : (
                <View style={styles.explorerGrid}>
                  {followExplorers.map((explorer) => (
                    <ExplorerCardMini
                      key={explorer.username}
                      explorer={explorer}
                      onPress={() => router.push(`/explorer/${explorer.username}`)}
                    />
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* Entries */}
        <SectionDivider title="ENTRIES" action={feedTab === 0 ? 'VIEW ALL' : undefined} onAction={feedTab === 0 ? () => router.push('/discover?tab=2') : undefined} />
        <View style={styles.sectionContent}>
          {(() => {
            const ents = feedTab === 0 ? entries : followEntries;
            if (ents.length === 0) {
              return (
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  {feedTab === 0 ? 'No entries found' : 'No entries from explorers you follow'}
                </Text>
              );
            }
            return ents.map((entry) => (
              <EntryCardFull key={entry.id} entry={entry} onPress={() => router.push(`/entry/${entry.id}`)} />
            ));
          })()}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: brandColors.black,
    borderBottomWidth: 3,
    borderBottomColor: brandColors.copper,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellWrap: { position: 'relative' },
  bellBadge: { position: 'absolute', top: -4, right: -6, backgroundColor: brandColors.copper, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderRadius: 0 },
  bellBadgeText: { color: '#ffffff', fontFamily: mono, fontSize: 9, fontWeight: '700' },
  // Feed toggle
  feedToggleWrap: { paddingHorizontal: 16, paddingTop: 12 },
  feedToggle: { flexDirection: 'row' },
  feedToggleBtn: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 },
  feedToggleLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, fontFamily: mono },
  feedToggleCount: { fontSize: 16, fontWeight: '700', fontFamily: mono },
  // Atlas
  atlasWrap: { paddingHorizontal: 16, paddingTop: 12 },
  atlasCard: {},
  atlasMap: { position: 'relative' },
  atlasOverlay: { backgroundColor: brandColors.black, padding: 8, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  atlasTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#ffffff', fontFamily: mono },
  atlasOverlayRight: { flexDirection: 'row', gap: 6 },
  atlasExpandBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 3, paddingHorizontal: 8 },
  atlasExpandText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.5)', fontFamily: mono },
  atlasToggleBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 14 },
  atlasToggleBtnWrap: { flexDirection: 'row' },
  atlasToggleBtn: { paddingVertical: 3, paddingHorizontal: 10, borderWidth: 1 },
  atlasToggleBtnText: { fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  atlasToggleCount: { fontFamily: mono, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  atlasStatsRow: {},
  // Popups
  popupWrap: { position: 'absolute', top: 8, left: 8, right: 8, borderWidth: borders.thick, padding: 10, zIndex: 10 },
  popupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  popupTitle: { fontFamily: mono, fontSize: 13, fontWeight: '700', flex: 1 },
  popupClose: { fontSize: 14, fontWeight: '600' },
  popupPlace: { fontFamily: mono, fontSize: 12, marginTop: 2 },
  popupDate: { fontFamily: mono, fontSize: 11, marginTop: 2 },
  popupBtn: { marginTop: 8, backgroundColor: brandColors.copper, paddingVertical: 10, alignItems: 'center' },
  popupBtnText: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.6 },
  // Sections
  sectionContent: { paddingHorizontal: 16 },
  sectionLoader: { paddingVertical: 20 },
  // Explorer grid
  explorerGrid: { flexDirection: 'row', gap: 8 },
  // Common
  centered: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 14, textAlign: 'center' },
  retryText: { color: brandColors.copper, fontWeight: '700', marginTop: 12, fontSize: 14 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 12 },
  // Following empty state
  followingEmpty: { alignItems: 'center', padding: 24 },
  followingEmptyTitle: { fontFamily: mono, fontSize: 14, fontWeight: '700', marginTop: 12 },
  followingEmptyDesc: { fontFamily: mono, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  followingEmptyBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  followingEmptyBtnText: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.6 },
  spacer: { height: 32 },
});
