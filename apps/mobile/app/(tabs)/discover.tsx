import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import { ExplorerCardMini } from '@/components/cards/ExplorerCardMini';
import { EntryCardFull } from '@/components/cards/EntryCardFull';
import { ExpeditionCardMini } from '@/components/cards/ExpeditionCardMini';
import type { Expedition, ExplorerProfile, Entry } from '@/types/api';

const TABS = ['EXPLORERS', 'EXPEDITIONS', 'ENTRIES'];

const EXPEDITION_FILTERS = ['ALL', 'ACTIVE', 'PLANNED', 'COMPLETED', 'BLUEPRINTS'];
const EXPLORER_FILTERS = ['ALL', 'ACTIVE NOW', 'PRO'];
const ENTRY_FILTERS = ['ALL', 'STANDARD', 'PHOTO', 'VIDEO', 'DATA'];

function QuickFilters({ options, active, onSelect, colors }: {
  options: string[];
  active: number;
  onSelect: (i: number) => void;
  colors: any;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickFilterRow}
    >
      {options.map((label, i) => {
        const isActive = i === active;
        return (
          <Pressable
            key={label}
            onPress={() => onSelect(i)}
            style={[
              styles.quickFilterChip,
              { borderColor: isActive ? brandColors.copper : colors.text },
              isActive && { backgroundColor: brandColors.copper },
            ]}
          >
            <Text
              style={[
                styles.quickFilterText,
                { color: isActive ? '#fff' : colors.text },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function DiscoverScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState(tab ? Number(tab) : 0);
  const [query, setQuery] = useState('');
  const [expFilter, setExpFilter] = useState(0);
  const [explorerFilter, setExplorerFilter] = useState(0);
  const [entryFilter, setEntryFilter] = useState(0);

  const handleTabChange = useCallback((i: number) => {
    setActiveTab(i);
  }, []);

  // Fetch data
  const { data: tripsData, loading: tripsLoading, error: tripsError, refetch: refetchTrips } = useApi<{ data: Expedition[] }>('/trips');
  const { data: usersData, loading: usersLoading, error: usersError, refetch: refetchUsers } = useApi<{ data: ExplorerProfile[] }>('/users');
  const { data: postsData, loading: postsLoading, error: postsError, refetch: refetchPosts } = useApi<{ data: Entry[] }>('/posts');
  const { data: blueprintsData, refetch: refetchBlueprints } = useApi<{ data: Expedition[] }>('/trips/blueprints?limit=50');

  const allItems = (tripsData?.data ?? []).filter(e => e.status !== 'cancelled');
  const publishedBlueprints = blueprintsData?.data ?? [];
  const allExpeditions = allItems.filter(e => !e.isBlueprint);
  const allBlueprints = publishedBlueprints.length > 0
    ? publishedBlueprints
    : allItems.filter(e => e.isBlueprint);
  const allExplorers = usersData?.data ?? [];
  const allEntries = postsData?.data ?? [];

  const q = query.toLowerCase().trim();

  // Expedition filtering: text search + quick filter
  const filteredExpeditions = useMemo(() => {
    let source: Expedition[];
    if (expFilter === 4) {
      source = allBlueprints;
    } else {
      source = expFilter === 0 ? [...allExpeditions, ...allBlueprints] : allExpeditions;
    }

    // Apply status filter
    if (expFilter === 1) source = source.filter(e => e.status === 'active');
    else if (expFilter === 2) source = source.filter(e => e.status === 'planned');
    else if (expFilter === 3) source = source.filter(e => e.status === 'completed');

    // Apply text search
    if (q) {
      source = source.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.locationName?.toLowerCase().includes(q) ||
        e.region?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.author?.username.toLowerCase().includes(q)
      );
    }

    return source;
  }, [allExpeditions, allBlueprints, expFilter, q]);

  // Explorer filtering
  const filteredExplorers = useMemo(() => {
    let source = allExplorers;
    if (explorerFilter === 1) source = source.filter(e => !!e.activeExpeditionLocation);
    else if (explorerFilter === 2) source = source.filter(e => !!e.creator);

    if (q) {
      source = source.filter(e =>
        e.username.toLowerCase().includes(q) ||
        e.name?.toLowerCase().includes(q) ||
        e.locationLives?.toLowerCase().includes(q) ||
        e.locationFrom?.toLowerCase().includes(q)
      );
    }
    return source;
  }, [allExplorers, explorerFilter, q]);

  // Entry filtering
  const filteredEntries = useMemo(() => {
    let source = allEntries;
    if (entryFilter === 1) source = source.filter(e => e.entryType === 'standard' || !e.entryType);
    else if (entryFilter === 2) source = source.filter(e => e.entryType === 'photo');
    else if (entryFilter === 3) source = source.filter(e => e.entryType === 'video');
    else if (entryFilter === 4) source = source.filter(e => e.entryType === 'data');

    if (q) {
      source = source.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.place?.toLowerCase().includes(q) ||
        e.author?.username.toLowerCase().includes(q)
      );
    }
    return source;
  }, [allEntries, entryFilter, q]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTrips(), refetchUsers(), refetchPosts(), refetchBlueprints()]);
    setRefreshing(false);
  }, [refetchTrips, refetchUsers, refetchPosts, refetchBlueprints]);

  const quickFilters = activeTab === 0
    ? <QuickFilters options={EXPLORER_FILTERS} active={explorerFilter} onSelect={setExplorerFilter} colors={colors} />
    : activeTab === 1
    ? <QuickFilters options={EXPEDITION_FILTERS} active={expFilter} onSelect={setExpFilter} colors={colors} />
    : <QuickFilters options={ENTRY_FILTERS} active={entryFilter} onSelect={setEntryFilter} colors={colors} />;

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
          options={TABS}
          active={activeTab}
          onSelect={handleTabChange}
        />
      </View>
      {quickFilters}
    </>
  ), [query, activeTab, quickFilters, handleTabChange]);

  const renderExpedition = useCallback(({ item }: { item: Expedition }) => (
    <View style={styles.cardWrap}>
      <ExpeditionCardMini
        expedition={item}
        onPress={() => router.push(`/expedition/${item.id}`)}
      />
    </View>
  ), [router]);

  const renderExplorer = useCallback(({ item }: { item: ExplorerProfile }) => (
    <ExplorerCardMini
      explorer={item}
      onPress={() => router.push(`/explorer/${item.username}`)}
    />
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
          data={filteredExplorers}
          keyExtractor={(item) => item.username}
          renderItem={renderExplorer}
          numColumns={2}
          columnWrapperStyle={styles.explorerRow}
          ListHeaderComponent={listHeader}
          ListFooterComponent={<View style={styles.spacer} />}
          ListEmptyComponent={
            usersLoading ? <ActivityIndicator color={brandColors.copper} style={styles.listLoader} /> :
            usersError ? <Text style={[styles.listMessage, { color: colors.textTertiary }]}>Failed to load explorers. Pull to retry.</Text> :
            <Text style={[styles.listMessage, { color: colors.textTertiary }]}>No explorers found</Text>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.copper} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {activeTab === 1 && (
        <FlatList
          data={filteredExpeditions}
          keyExtractor={(item) => item.id}
          renderItem={renderExpedition}
          ListHeaderComponent={listHeader}
          ListFooterComponent={<View style={styles.spacer} />}
          ListEmptyComponent={
            tripsLoading ? <ActivityIndicator color={brandColors.copper} style={styles.listLoader} /> :
            tripsError ? <Text style={[styles.listMessage, { color: colors.textTertiary }]}>Failed to load expeditions. Pull to retry.</Text> :
            <Text style={[styles.listMessage, { color: colors.textTertiary }]}>No expeditions found</Text>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brandColors.copper} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {activeTab === 2 && (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          ListHeaderComponent={listHeader}
          ListFooterComponent={<View style={styles.spacer} />}
          ListEmptyComponent={
            postsLoading ? <ActivityIndicator color={brandColors.copper} style={styles.listLoader} /> :
            postsError ? <Text style={[styles.listMessage, { color: colors.textTertiary }]}>Failed to load entries. Pull to retry.</Text> :
            <Text style={[styles.listMessage, { color: colors.textTertiary }]}>No entries found</Text>
          }
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
  quickFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  quickFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: borders.thick,
  },
  quickFilterText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
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
  listLoader: { paddingVertical: 32 },
  listMessage: { fontFamily: mono, fontSize: 12, fontWeight: '600', textAlign: 'center', paddingVertical: 32 },
  spacer: { height: 32 },
});
