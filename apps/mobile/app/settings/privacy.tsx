import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { settingsApi } from '@/services/api';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HButton } from '@/components/ui/HButton';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { ProfileSettings } from '@/types/api';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user } = useAuth();

  const { data: profile, loading } = useApi<ProfileSettings>(
    ready ? '/user/settings/profile' : null,
  );

  const [profilePublic, setProfilePublic] = useState(true);

  useEffect(() => {
    if (profile?.locationVisibility) {
      setProfilePublic(profile.locationVisibility !== 'private');
    }
  }, [profile]);

  const handleToggleVisibility = async () => {
    const newVal = !profilePublic;
    setProfilePublic(newVal);
    try {
      await settingsApi.updateProfile({
        locationVisibility: newVal ? 'public' : 'private',
      } as Partial<ProfileSettings>);
    } catch (err: any) {
      setProfilePublic(!newVal);
      Alert.alert('Error', err.message ?? 'Failed to save');
    }
  };

  const maskedEmail = user?.email
    ? `${user.email.charAt(0)}***@${user.email.split('@')[1] ?? 'mail.com'}`
    : 'Not set';

  if (!ready || loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="PRIVACY & SECURITY" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="PRIVACY & SECURITY" />

      <ScrollView>
        <View style={styles.content}>
          <HCard>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Profile Visibility</Text>
                <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>
                  {profilePublic ? 'Your profile is visible to everyone' : 'Your profile is hidden'}
                </Text>
              </View>
              <Switch
                value={profilePublic}
                onValueChange={handleToggleVisibility}
                trackColor={{ false: colors.border, true: brandColors.copper }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.borderThin }]}>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>Email</Text>
                <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{maskedEmail}</Text>
              </View>
            </View>
          </HCard>

          <View style={styles.passwordSection}>
            <HButton
              variant="copper"
              outline
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              CHANGE PASSWORD
            </HButton>
          </View>
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
  passwordSection: {
    marginTop: 16,
  },
});
