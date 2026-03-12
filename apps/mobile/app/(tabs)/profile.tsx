import React, { useState, useEffect, useCallback, ComponentType } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { explorerApi } from '@/services/api';
import { ProfileBanner } from '@/components/profile/ProfileBanner';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { StatsBar } from '@/components/ui/StatsBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { HButton } from '@/components/ui/HButton';
import { ExpeditionCardMini } from '@/components/cards/ExpeditionCardMini';
import { EntryCardMini } from '@/components/cards/EntryCardMini';
import { ExplorerCardMini } from '@/components/cards/ExplorerCardMini';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { HeimuMapProps, WaypointMarker } from '@/components/map/HeimuMap';
import type { Expedition, Entry, ExplorerProfile } from '@/types/api';
import { getExplorerStatus, explorerStatusConfig } from '@/utils/explorerStatus';

const TABS = ['EXPEDITIONS', 'ENTRIES', 'FOLLOWS'];
const FOLLOW_TABS = ['FOLLOWING', 'FOLLOWERS'];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { ready, user } = useRequireAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [followTab, setFollowTab] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [bannerHeight, setBannerHeight] = useState(0);

  // Defer MapboxGL import to avoid blocking the JS thread
  const [MapComponent, setMapComponent] = useState<ComponentType<HeimuMapProps> | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/components/map/HeimuMap').then((mod) => setMapComponent(() => mod.default));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const focusOpts = { refetchOnFocus: true };

  // Fetch full profile for avatar, cover photo, bio, location, etc.
  const { data: profile } = useApi<ExplorerProfile>(
    ready && user ? `/users/${user.username}` : null, focusOpts,
  );

  const { data: tripsData } = useApi<{ data: Expedition[]; results: number }>(
    ready && user ? `/users/${user.username}/trips` : null, focusOpts,
  );
  const { data: postsData } = useApi<{ data: Entry[]; results: number }>(
    ready && user ? `/users/${user.username}/posts` : null, focusOpts,
  );
  const { data: followingData, refetch: refetchFollowing } = useApi<{ data: ExplorerProfile[] }>(
    ready && user ? `/users/${user.username}/following` : null, focusOpts,
  );
  const { data: followersData, refetch: refetchFollowers } = useApi<{ data: ExplorerProfile[] }>(
    ready && user ? `/users/${user.username}/followers` : null, focusOpts,
  );

  const [loadingFollow, setLoadingFollow] = useState<Record<string, boolean>>({});

  if (!ready) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const expeditions = tripsData?.data ?? [];
  const entries = postsData?.data ?? [];
  const following = followingData?.data ?? [];
  const followers = followersData?.data ?? [];

  const followingUsernames = new Set(following.map((f) => f.username));

  const handleFollow = useCallback(async (targetUsername: string) => {
    setLoadingFollow((prev) => ({ ...prev, [targetUsername]: true }));
    try {
      await explorerApi.follow(targetUsername);
      await Promise.all([refetchFollowing(), refetchFollowers()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to follow';
      Alert.alert('Error', msg);
    } finally {
      setLoadingFollow((prev) => ({ ...prev, [targetUsername]: false }));
    }
  }, [refetchFollowing, refetchFollowers]);

  const handleUnfollow = useCallback(async (targetUsername: string) => {
    setLoadingFollow((prev) => ({ ...prev, [targetUsername]: true }));
    try {
      await explorerApi.unfollow(targetUsername);
      await Promise.all([refetchFollowing(), refetchFollowers()]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to unfollow';
      Alert.alert('Error', msg);
    } finally {
      setLoadingFollow((prev) => ({ ...prev, [targetUsername]: false }));
    }
  }, [refetchFollowing, refetchFollowers]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <TopoBackground topOffset={bannerHeight} />
      <ScrollView>
        {(() => {
          const status = getExplorerStatus(expeditions, profile?.activeExpeditionOffGrid);
          const cfg = explorerStatusConfig[status];
          return (
            <StatusHeader
              status="active"
              label={cfg.label}
              dotColor={cfg.color}
              right={profile?.activeExpeditionLocation?.expeditionTitle}
              variant="detail"
            />
          );
        })()}
        <View onLayout={(e) => setBannerHeight(e.nativeEvent.layout.height)}>
        <ProfileBanner
          username={user!.username}
          displayName={profile?.name ?? user!.display_name}
          bio={profile?.bio}
          location={profile?.locationFrom || profile?.locationLives}
          memberSince={profile?.memberDate ? new Date(profile.memberDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : undefined}
          isPro={profile?.creator ?? user!.is_pro}
          avatarUrl={profile?.picture ?? user!.avatar_url}
          coverPhotoUrl={profile?.coverPhoto}
        />
        </View>

        {/* Stats bar */}
        <View style={[styles.statsWrap, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          <StatsBar
            stats={[
              { value: String(expeditions.length), label: 'EXPED.' },
              { value: String(entries.length), label: 'ENTRIES' },
              { value: '0', label: 'SPONSORS' },
              { value: String(following.length + followers.length), label: 'FOLLOW' },
            ]}
          />
        </View>

        {/* Edit Profile button */}
        <View style={styles.btnWrap}>
          <HButton
            variant="copper"
            outline
            small
            onPress={() => router.push('/settings/profile')}
          >
            EDIT PROFILE
          </HButton>
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

        {/* Tab control */}
        <View style={styles.tabWrap}>
          <SegmentedControl
            options={TABS}
            active={activeTab}
            onSelect={setActiveTab}
          />
        </View>

        {/* Tab content */}
        <View style={styles.contentWrap}>
          {activeTab === 0 && (
            expeditions.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textTertiary }]}>No expeditions yet</Text>
            ) : (
              expeditions.map((exp) => (
                <ExpeditionCardMini
                  key={exp.id}
                  expedition={exp}
                  onPress={() => router.push(`/expedition/${exp.id}`)}
                />
              ))
            )
          )}
          {activeTab === 1 && (
            entries.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textTertiary }]}>No entries yet</Text>
            ) : (
              entries.map((entry) => (
                <EntryCardMini
                  key={entry.id}
                  entry={entry}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                  showAuthor={false}
                />
              ))
            )
          )}
          {activeTab === 2 && (
            <>
              <SegmentedControl
                options={FOLLOW_TABS}
                active={followTab}
                onSelect={setFollowTab}
              />
              <View style={styles.followGrid}>
                {followTab === 0 && (
                  following.length === 0 ? (
                    <Text style={[styles.empty, { color: colors.textTertiary }]}>Not following anyone yet</Text>
                  ) : (
                    following.map((explorer) => (
                      <ExplorerCardMini
                        key={explorer.username}
                        explorer={explorer}
                        onPress={() => router.push(`/explorer/${explorer.username}`)}
                        action={{ label: 'UNFOLLOW', color: brandColors.red, onPress: () => handleUnfollow(explorer.username), loading: !!loadingFollow[explorer.username] }}
                      />
                    ))
                  )
                )}
                {followTab === 1 && (
                  followers.length === 0 ? (
                    <Text style={[styles.empty, { color: colors.textTertiary }]}>No followers yet</Text>
                  ) : (
                    followers.map((explorer) => {
                      const isFollowing = followingUsernames.has(explorer.username);
                      return (
                        <ExplorerCardMini
                          key={explorer.username}
                          explorer={explorer}
                          onPress={() => router.push(`/explorer/${explorer.username}`)}
                          action={isFollowing
                            ? { label: 'UNFOLLOW', color: brandColors.red, onPress: () => handleUnfollow(explorer.username), loading: !!loadingFollow[explorer.username] }
                            : { label: 'FOLLOW BACK', color: brandColors.blue, onPress: () => handleFollow(explorer.username), loading: !!loadingFollow[explorer.username] }
                          }
                        />
                      );
                    })
                  )
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: 'center' },
  statsWrap: {
    borderTopWidth: borders.thick,
    borderBottomWidth: borders.thick,
  },
  mapWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
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
    paddingVertical: 5,
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
  btnWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  contentWrap: {
    paddingHorizontal: 16,
  },
  empty: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 32,
    width: '100%',
  },
  followGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  spacer: { height: 32 },
});
