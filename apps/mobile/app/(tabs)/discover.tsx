import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { HCard } from '@/components/ui/HCard';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { mono, colors as brandColors, spacing } from '@/theme/tokens';
import { ExplorerCardMini } from '@/components/cards/ExplorerCardMini';
import { EntryCardFull } from '@/components/cards/EntryCardFull';
import { ExpeditionCardMini } from '@/components/cards/ExpeditionCardMini';
import type { Expedition, ExplorerProfile, Entry } from '@/types/api';

const FILTER_TABS = ['EXPEDITIONS', 'EXPLORERS', 'ENTRIES'];

export default function DiscoverScreen() {
  const { dark, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState(tab ? Number(tab) : 0);
  const [query, setQuery] = useState('');

  // Fetch trending data
  const { data: tripsData, refetch: refetchTrips } = useApi<{ data: Expedition[] }>('/trips');
  const { data: usersData, refetch: refetchUsers } = useApi<{ data: ExplorerProfile[] }>('/users');
  const { data: postsData, refetch: refetchPosts } = useApi<{ data: Entry[] }>('/posts');

  const allExpeditions = tripsData?.data ?? [];
  const allExplorers = usersData?.data ?? [];
  const allEntries = postsData?.data ?? [];

  const q = query.toLowerCase().trim();
  const trending = useMemo(() => q
    ? allExpeditions.filter(e => e.title.toLowerCase().includes(q) || e.region?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q) || e.author?.username.toLowerCase().includes(q))
    : allExpeditions, [allExpeditions, q]);
  const explorers = useMemo(() => q
    ? allExplorers.filter(e => e.username.toLowerCase().includes(q) || e.name?.toLowerCase().includes(q) || e.locationLives?.toLowerCase().includes(q) || e.locationFrom?.toLowerCase().includes(q))
    : allExplorers, [allExplorers, q]);
  const entries = useMemo(() => q
    ? allEntries.filter(e => e.title?.toLowerCase().includes(q) || e.place?.toLowerCase().includes(q) || e.author?.username.toLowerCase().includes(q))
    : allEntries, [allEntries, q]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTrips(), refetchUsers(), refetchPosts()]);
    setRefreshing(false);
  }, [refetchTrips, refetchUsers, refetchPosts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground topOffset={insets.top + 47} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>DISCOVER</Text>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.copper} />}
      >
        {/* Search */}
        <View style={styles.searchWrap}>
          <SearchBar
            placeholder="Search explorers, expeditions, entries..."
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Filter tabs */}
        <View style={styles.filterWrap}>
          <SegmentedControl
            options={FILTER_TABS}
            active={activeTab}
            onSelect={setActiveTab}
          />
        </View>

        {/* Expeditions */}
        {activeTab === 0 && (
          <View style={styles.sectionContent}>
            {trending.map((item) => (
              <ExpeditionCardMini
                key={item.id}
                expedition={item}
                onPress={() => router.push(`/expedition/${item.id}`)}
              />
            ))}
          </View>
        )}

        {/* Explorers */}
        {activeTab === 1 && (
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
        )}

        {/* Entries */}
        {activeTab === 2 && (
          <View style={styles.sectionContent}>
            {entries.map((entry) => (
              <EntryCardFull
                key={entry.id}
                entry={entry}
                onPress={() => router.push(`/entry/${entry.id}`)}
              />
            ))}
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: brandColors.copper,
    backgroundColor: brandColors.black,
  },
  headerTitle: {
    fontFamily: mono,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2.1,
    color: '#e5e5e5',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  explorerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  spacer: { height: 32 },
});
