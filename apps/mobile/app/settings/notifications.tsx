import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { settingsApi } from '@/services/api';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { mono, colors as brandColors } from '@/theme/tokens';
import type { ProfileSettings } from '@/types/api';

const NOTIFICATION_KEYS = [
  { key: 'sponsorship', label: 'Sponsorship Activity', desc: 'New sponsors and sponsorship updates' },
  { key: 'digest', label: 'Weekly Digest', desc: 'Summary of activity on your expeditions' },
  { key: 'entries_following', label: 'Entries from Following', desc: 'New entries from explorers you follow' },
  { key: 'milestones', label: 'Milestones', desc: 'Achievement and milestone notifications' },
  { key: 'announcements', label: 'Announcements', desc: 'Product updates and new features' },
];

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const { data: profile, loading } = useApi<ProfileSettings>(
    ready ? '/user/settings/profile' : null,
  );

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.notificationPreferences) {
      setPrefs(profile.notificationPreferences);
    }
  }, [profile]);

  const handleToggle = async (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await settingsApi.updateProfile({ notificationPreferences: updated });
    } catch (err: any) {
      setPrefs(prefs);
      Alert.alert('Error', err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!ready || loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="NOTIFICATIONS" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="NOTIFICATIONS" />

      <ScrollView>
        <View style={styles.content}>
          <HCard>
            {NOTIFICATION_KEYS.map((item, i) => (
              <View
                key={item.key}
                style={[
                  styles.row,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                ]}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{item.desc}</Text>
                </View>
                <Switch
                  value={prefs[item.key] !== false}
                  onValueChange={() => handleToggle(item.key)}
                  trackColor={{ false: colors.border, true: brandColors.copper }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </HCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  content: { padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  rowText: { flex: 1, marginRight: 12 },
  rowLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});
