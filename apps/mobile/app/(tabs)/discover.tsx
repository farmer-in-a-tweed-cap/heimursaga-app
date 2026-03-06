import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  const { data: tripsData } = useApi<{ data: Expedition[] }>('/trips');
  const { data: usersData } = useApi<{ data: ExplorerProfile[] }>('/users');
  const { data: postsData } = useApi<{ data: Entry[] }>('/posts');

  const trending = tripsData?.data ?? [];
  const explorers = usersData?.data ?? [];
  const entries = postsData?.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground topOffset={insets.top + 47} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>DISCOVER</Text>
      </View>

      <ScrollView>
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
