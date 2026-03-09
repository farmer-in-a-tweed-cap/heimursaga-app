import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { ExplorerCardMini } from '@/components/cards/ExplorerCardMini';
import { colors as brandColors } from '@/theme/tokens';
import type { ExplorerProfile } from '@/types/api';

export default function FollowingScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const router = useRouter();

  const { data, loading } = useApi<{ data: ExplorerProfile[] }>(
    username ? `/users/${username}/following` : null, { refetchOnFocus: true },
  );

  const following = data?.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title={`${username} · FOLLOWING`} />
      {loading ? (
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      ) : (
        <View style={styles.grid}>
          {following.map((explorer) => (
            <ExplorerCardMini
              key={explorer.username}
              explorer={explorer}
              onPress={() => router.push(`/explorer/${explorer.username}`)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
});
