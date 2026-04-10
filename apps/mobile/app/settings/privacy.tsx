import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { settingsApi, authApi } from '@/services/api';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HButton } from '@/components/ui/HButton';
import { mono, colors as brandColors } from '@/theme/tokens';
import { clearTokens } from '@/services/tokenStorage';

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user } = useAuth();

  const [sendingReset, setSendingReset] = useState(false);

  const maskedEmail = user?.email
    ? `${user.email.charAt(0)}***@${user.email.split('@')[1] ?? 'mail.com'}`
    : 'Not set';

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'No email associated with this account.');
      return;
    }
    setSendingReset(true);
    try {
      await authApi.resetPassword(user.email);
      Alert.alert('Check your email', 'We sent a password reset link to your email address.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send reset email');
    } finally {
      setSendingReset(false);
    }
  };

  if (!ready) {
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
                <Text style={[styles.rowLabel, { color: colors.text }]}>Email</Text>
                <Text style={[styles.rowDesc, { color: colors.textTertiary }]}>{maskedEmail}</Text>
              </View>
            </View>
          </HCard>

          <View style={styles.passwordSection}>
            <HButton
              variant="copper"
              outline
              onPress={handleChangePassword}
              disabled={sendingReset}
            >
              {sendingReset ? 'SENDING...' : 'CHANGE PASSWORD'}
            </HButton>
            <Text style={[styles.passwordHint, { color: colors.textTertiary }]}>
              Sends a password reset link to your email
            </Text>
          </View>

          <View style={styles.dangerSection}>
            <Text style={[styles.dangerTitle, { color: brandColors.red }]}>DANGER ZONE</Text>
            <HButton
              variant="destructive"
              outline
              onPress={() => {
                Alert.alert(
                  'Delete Account',
                  'This will permanently delete your account and all associated data. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete Account',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert(
                          'Are you sure?',
                          'Type DELETE to confirm account deletion.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Permanently Delete',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await settingsApi.deleteAccount();
                                  await clearTokens();
                                  router.replace('/(auth)/login');
                                } catch (err: any) {
                                  Alert.alert('Error', err.message ?? 'Failed to delete account');
                                }
                              },
                            },
                          ],
                        );
                      },
                    },
                  ],
                );
              }}
            >
              DELETE ACCOUNT
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
    gap: 6,
  },
  passwordHint: {
    fontFamily: mono,
    fontSize: 11,
    textAlign: 'center',
  },
  dangerSection: {
    marginTop: 32,
    gap: 10,
  },
  dangerTitle: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
