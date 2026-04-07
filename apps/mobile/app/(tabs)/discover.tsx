import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { mono, colors as brandColors } from '@/theme/tokens';
import { ExplorerCardMini } from '@/components/cards/ExplorerCardMini';
import { EntryCardFull } from '@/components/cards/EntryCardFull';
import { ExpeditionCardMini } from '@/components/cards/ExpeditionCardMini';
import type { Expedition, ExplorerProfile, Entry } from '@/types/api';

const FILTER_TABS = ['EXPEDITIONS', 'EXPLORERS', 'ENTRIES'];

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState(tab ? Number(tab) : 0);
  const [query, setQuery] = useState('');

  // Fetch trending data
  const { data: tripsData, refetch: refetchTrips } = useApi<{ data: Expedition[] }>('/trips');
  const { data: usersData, refetch: refetchUsers } = useApi<{ data: ExplorerProfile[] }>('/users');
  const { data: postsData, refetch: refetchPosts } = useApi<{ data: Entry[] }>('/posts');

  const allExpeditions = (tripsData?.data ?? []).filter(e => e.status !== 'cancelled');
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

  const listHeader = useMemo(() => (
    <>
      <View style={styles.searchWrap}>
        <SearchBar
          placeholder="Search explorers, expeditions, entries..."
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <View style={styles.filterWrap}>
        <SegmentedControl
          options={FILTER_TABS}
          active={activeTab}
          onSelect={setActiveTab}
        />
      </View>
    </>
  ), [query, activeTab]);

  const renderExpedition = useCallback(({ item }: { item: Expedition }) => (
    <View style={styles.cardWrap}>
      <ExpeditionCardMini
        expedition={item}
        onPress={() => router.push(`/expedition/${item.id}`)}
      />
    </View>
  ), [router]);

  const renderExplorer = useCallback(({ item }: { item: ExplorerProfile }) => (
    <View style={styles.cardWrap}>
      <ExplorerCardMini
        explorer={item}
        onPress={() => router.push(`/explorer/${item.username}`)}
      />
    </View>
  ), [router]);

  const renderEntry = useCallback(({ item }: { item: Entry }) => (
    <View style={styles.cardWrap}>
      <EntryCardFull
        entry={item}
        onPress={() => router.push(`/entry/${item.id}`)}
      />
    </View>
  ), [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground topOffset={insets.top + 47} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>DISCOVER</Text>
      </View>

      {activeTab === 0 && (
        <FlatList
          data={trending}
          keyExtractor={(item) => item.id}
          renderItem={renderExpedition}
          ListHeaderComponent={listHeader}
          ListFooterComponent={<View style={styles.spacer} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.copper} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {activeTab === 1 && (
        <FlatList
          data={explorers}
          keyExtractor={(item) => item.username}
          renderItem={renderExplorer}
          numColumns={2}
          columnWrapperStyle={styles.explorerRow}
          ListHeaderComponent={listHeader}
          ListFooterComponent={<View style={styles.spacer} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.copper} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {activeTab === 2 && (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          ListHeaderComponent={listHeader}
          ListFooterComponent={<View style={styles.spacer} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.copper} />}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  listContent: {
    paddingBottom: 16,
  },
  cardWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  explorerRow: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 12,
  },
  spacer: { height: 32 },
});
