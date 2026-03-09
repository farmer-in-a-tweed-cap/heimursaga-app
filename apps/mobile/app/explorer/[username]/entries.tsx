import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { EntryCardMini } from '@/components/cards/EntryCardMini';
import { colors as brandColors, mono } from '@/theme/tokens';
import type { Entry } from '@/types/api';

export default function ExplorerEntriesScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const { data, loading } = useApi<{ data: Entry[] }>(
    username ? `/users/${username}/posts` : null,
  );
  const entries = data?.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar title={`${username} · ENTRIES`} onBack={() => router.back()} />

      <ScrollView>
        {loading && entries.length === 0 ? (
          <ActivityIndicator color={brandColors.copper} style={styles.loader} />
        ) : entries.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No journal entries yet
          </Text>
        ) : (
          <View style={styles.list}>
            {entries.map((entry) => (
              <EntryCardMini
                key={entry.id}
                entry={entry}
                onPress={() => router.push(`/entry/${entry.id}`)}
                showAuthor={false}
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
  loader: { paddingVertical: 40 },
  list: { paddingHorizontal: 16, paddingTop: 12 },
  emptyText: {
    fontFamily: mono,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 40,
  },
  spacer: { height: 32 },
});
