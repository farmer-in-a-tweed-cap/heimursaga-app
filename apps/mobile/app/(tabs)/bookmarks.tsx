import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { ExpeditionCardMini } from '@/components/cards/ExpeditionCardMini';
import { EntryCardMini } from '@/components/cards/EntryCardMini';
import { ExplorerCardMini } from '@/components/cards/ExplorerCardMini';
import { mono, colors as brandColors } from '@/theme/tokens';
import type { Expedition, Entry, ExplorerProfile } from '@/types/api';

export default function BookmarksScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const focusOpts = { refetchOnFocus: true };

  const { data: expeditionsData, loading: loadingExp } = useApi<{ data: Expedition[] }>(
    ready ? '/user/bookmarks/expeditions' : null, focusOpts,
  );
  const { data: entriesData, loading: loadingEnt } = useApi<{ data: Entry[] }>(
    ready ? '/user/bookmarks' : null, focusOpts,
  );
  const { data: explorersData, loading: loadingExpl } = useApi<{ data: ExplorerProfile[] }>(
    ready ? '/user/bookmarks/explorers' : null, focusOpts,
  );

  const expeditions = expeditionsData?.data ?? [];
  const entries = entriesData?.data ?? [];
  const explorers = explorersData?.data ?? [];
  const loading = loadingExp || loadingEnt || loadingExpl;
  const isEmpty = expeditions.length === 0 && entries.length === 0 && explorers.length === 0;

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground topOffset={insets.top + 47} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>BOOKMARKS</Text>
      </View>

      <ScrollView>
        {isEmpty && !loading && (
          <Text style={[styles.empty, { color: colors.textTertiary }]}>No bookmarks yet</Text>
        )}

        {loading && isEmpty && (
          <ActivityIndicator color={brandColors.copper} style={{ marginTop: 40 }} />
        )}

        {expeditions.length > 0 && (
          <>
            <SectionDivider title="EXPEDITIONS" />
            <View style={styles.sectionContent}>
              {expeditions.map((exp) => (
                <ExpeditionCardMini
                  key={exp.id}
                  expedition={exp}
                  onPress={() => router.push(`/expedition/${exp.id}`)}
                />
              ))}
            </View>
          </>
        )}

        {explorers.length > 0 && (
          <>
            <SectionDivider title="EXPLORERS" />
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
        )}

        {entries.length > 0 && (
          <>
            <SectionDivider title="ENTRIES" />
            <View style={styles.sectionContent}>
              {entries.map((entry) => (
                <EntryCardMini
                  key={entry.id}
                  entry={entry}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                />
              ))}
            </View>
          </>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
  sectionContent: {
    paddingHorizontal: 16,
  },
  explorerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empty: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 40,
  },
  spacer: { height: 32 },
});
