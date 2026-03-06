import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HTextField } from '@/components/ui/HTextField';
import { HButton } from '@/components/ui/HButton';
import { settingsApi } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { ProfileSettings } from '@/types/api';

export default function ProfileSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const { data: profile, loading } = useApi<ProfileSettings>(
    ready ? '/user/settings/profile' : null,
  );

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '');
      setDisplayName(profile.name ?? profile.display_name ?? '');
      setBio(profile.bio ?? '');
      setLocation(profile.locationFrom ?? profile.location ?? '');
      setWebsite(profile.website ?? '');
    }
  }, [profile]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await settingsApi.updateProfile({
        name: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        locationFrom: location.trim() || undefined,
        website: website.trim() || undefined,
      });
      Alert.alert('Saved', 'Profile updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [displayName, bio, location, website, router]);

  if (!ready || loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="EDIT PROFILE" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="EDIT PROFILE" />

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <HCard>
            <View style={styles.formInner}>
              {/* Username - read only */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>USERNAME</Text>
                <View style={[styles.readOnlyField, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                  <Text style={[styles.readOnlyText, { color: colors.textTertiary }]}>
                    {username}
                  </Text>
                </View>
                <Text style={[styles.hint, { color: colors.textTertiary }]}>
                  Username cannot be changed
                </Text>
              </View>

              <HTextField
                label="DISPLAY NAME"
                placeholder="Your display name"
                value={displayName}
                onChangeText={setDisplayName}
              />

              {/* Bio - multiline */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>BIO</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  multiline
                  placeholder="Tell the world about your adventures..."
                  placeholderTextColor={colors.textTertiary}
                  value={bio}
                  onChangeText={setBio}
                  textAlignVertical="top"
                />
              </View>

              <HTextField
                label="LOCATION"
                placeholder="e.g. Portland, OR"
                value={location}
                onChangeText={setLocation}
              />

              <HTextField
                label="WEBSITE"
                placeholder="https://yoursite.com"
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </HCard>

          <View style={styles.actions}>
            <HButton variant="copper" onPress={handleSave} disabled={saving}>
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </HButton>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  form: { padding: 16 },
  formInner: { padding: 14 },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  readOnlyField: {
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
    opacity: 0.6,
  },
  readOnlyText: {
    fontSize: 15,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
  textarea: {
    borderWidth: borders.thick,
    padding: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 100,
  },
  actions: {
    marginTop: 8,
  },
  spacer: { height: 32 },
});
