import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { ExpeditionCardMini } from '@/components/cards/ExpeditionCardMini';
import { colors as brandColors, mono } from '@/theme/tokens';
import type { Expedition } from '@/types/api';

export default function ExplorerExpeditionsScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const { data, loading } = useApi<{ data: Expedition[] }>(
    username ? `/users/${username}/trips` : null,
  );
  const expeditions = data?.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar title={`${username} · EXPEDITIONS`} onBack={() => router.back()} />

      <ScrollView>
        {loading && expeditions.length === 0 ? (
          <ActivityIndicator color={brandColors.copper} style={styles.loader} />
        ) : expeditions.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No expeditions yet
          </Text>
        ) : (
          <View style={styles.list}>
            {expeditions.map((exp) => (
              <ExpeditionCardMini
                key={exp.id}
                expedition={exp}
                onPress={() => router.push(`/expedition/${exp.id}`)}
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
