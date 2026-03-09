import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Polyline } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { Avatar } from '@/components/ui/Avatar';
import { mono, colors as brandColors, borders } from '@/theme/tokens';

interface SettingsItem {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
  destructive?: boolean;
}

function Chevron({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Polyline points="9 18 15 12 9 6" />
    </Svg>
  );
}

export default function SettingsScreen() {
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user, biometricEnabled, biometricAvailable, setBiometricEnabled, logout } = useAuth();

  if (!ready || !user) return null;

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : undefined;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleToggleBiometric = async () => {
    await setBiometricEnabled(!biometricEnabled);
  };

  const sections: SettingsSection[] = [
    {
      title: 'PROFILE',
      items: [
        { label: 'Username', value: user.username, onPress: () => router.push('/settings/profile') },
        { label: 'Display Name', value: user.display_name || 'Not set', onPress: () => router.push('/settings/profile') },
        { label: 'Bio', value: 'Edit bio...', onPress: () => router.push('/settings/profile') },
        { label: 'Location', value: 'Edit location...', onPress: () => router.push('/settings/profile') },
      ],
    },
    {
      title: 'PREFERENCES',
      items: [
        { label: 'Distance Units', value: 'Metric (km)', onPress: () => router.push('/settings/preferences') },
        { label: 'Theme', value: dark ? 'Dark' : 'Light', onPress: () => router.push('/settings/preferences') },
        { label: 'Notifications', value: 'All enabled', onPress: () => router.push('/settings/notifications') },
        ...(biometricAvailable ? [{
          label: 'Biometric Lock',
          value: biometricEnabled ? 'Enabled' : 'Disabled',
          onPress: handleToggleBiometric,
        }] : []),
      ],
    },
    {
      title: 'PRIVACY & SECURITY',
      items: [
        { label: 'Email', value: user.email ? `${user.email.charAt(0)}***@${user.email.split('@')[1] ?? 'mail.com'}` : 'Not set', onPress: () => router.push('/settings/privacy') },
        { label: 'Password', value: 'Change password', onPress: () => router.push('/settings/privacy') },
      ],
    },
    {
      title: 'BILLING',
      items: [
        { label: 'Plan', value: user.is_pro ? 'Explorer Pro — $8/mo' : 'Free', onPress: () => router.push('/settings/billing') },
        ...(user.is_pro ? [
          { label: 'Payment Method', value: '•••• ****', onPress: () => router.push('/settings/billing') },
          { label: 'Next Billing', value: 'Manage billing', onPress: () => router.push('/settings/billing') },
        ] : []),
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="SETTINGS" />

      <ScrollView>
        {/* Profile header */}
        <View style={styles.header}>
          <Avatar size={56} name={user.username} pro={user.is_pro} />
          <View>
            <Text style={[styles.headerName, { color: colors.text }]}>{user.username}</Text>
            {user.is_pro && (
              <Text style={styles.proBadge}>EXPLORER PRO</Text>
            )}
            <Text style={[styles.memberSince, { color: colors.textTertiary }]}>
              Member since {memberSince}
            </Text>
          </View>
        </View>

        {/* Settings sections */}
        {sections.map((section) => (
          <View key={section.title}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
                {section.title}
              </Text>
              <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.sectionContent}>
              <HCard>
                {section.items.map((item, i) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.settingsItem,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                    ]}
                    onPress={item.onPress}
                    disabled={!item.onPress}
                  >
                    <Text style={[styles.itemLabel, { color: colors.text }]}>
                      {item.label}
                    </Text>
                    <View style={styles.itemRight}>
                      {item.value && (
                        <Text style={[styles.itemValue, { color: colors.textTertiary }]}>
                          {item.value}
                        </Text>
                      )}
                      <Chevron color={colors.borderThin} />
                    </View>
                  </TouchableOpacity>
                ))}
              </HCard>
            </View>
          </View>
        ))}

        {/* Log Out */}
        <View style={styles.sectionContent}>
          <HCard>
            <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Log Out</Text>
              <Chevron color={colors.borderThin} />
            </TouchableOpacity>
          </HCard>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
  },
  proBadge: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: brandColors.copper,
    fontFamily: mono,
    marginTop: 3,
  },
  memberSince: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: mono,
  },
  sectionLine: {
    height: 2,
    marginTop: 4,
  },
  sectionContent: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingsItem: {
    padding: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemValue: {
    fontSize: 12,
  },
  spacer: { height: 32 },
});
