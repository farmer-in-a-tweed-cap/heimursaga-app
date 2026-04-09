import React, { useState, useEffect } from 'react';
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
import { HButton } from '@/components/ui/HButton';
import { Avatar } from '@/components/ui/Avatar';
import { paymentMethodApi, type PaymentMethodInfo } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';

interface SettingsItem {
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
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

  const [savedCard, setSavedCard] = useState<PaymentMethodInfo | null>(null);

  useEffect(() => {
    if (!user) return;
    paymentMethodApi.getAll()
      .then(res => {
        const cards = res.data ?? [];
        if (cards.length > 0) setSavedCard(cards.find(c => c.isDefault) ?? cards[0]);
      })
      .catch(() => {});
  }, [user]);

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

  const items: SettingsItem[] = [
    {
      label: 'Edit Profile',
      value: user.display_name || user.username,
      onPress: () => router.push('/settings/profile'),
    },
    {
      label: 'Preferences',
      value: dark ? 'Dark theme' : 'Light theme',
      onPress: () => router.push('/settings/preferences'),
    },
    ...(biometricAvailable ? [{
      label: 'Biometric Lock',
      value: biometricEnabled ? 'Enabled' : 'Disabled',
      onPress: handleToggleBiometric,
      toggle: true,
    }] : []),
    {
      label: 'Privacy & Security',
      onPress: () => router.push('/settings/privacy'),
    },
    {
      label: 'Billing',
      value: savedCard ? `${savedCard.label} •••• ${savedCard.last4}` : user.is_pro ? 'Explorer Pro' : 'Explorer',
      onPress: () => router.push('/settings/billing'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="SETTINGS" />

      <ScrollView>
        {/* Profile header */}
        <View style={styles.header}>
          <Avatar size={56} name={user.username} pro={user.is_pro} imageUrl={user.avatar_url || user.picture} />
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

        {/* Upgrade banner (free users only) */}
        {!user.is_pro && (
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={[styles.upgradeBanner, { backgroundColor: colors.card, borderColor: brandColors.copper }]}
              onPress={() => router.push('/upgrade')}
              activeOpacity={0.7}
            >
              <View style={styles.upgradeBannerLeft}>
                <View>
                  <Text style={[styles.upgradeBannerTitle, { color: colors.text }]}>Upgrade to Explorer Pro</Text>
                  <Text style={[styles.upgradeBannerDesc, { color: colors.textTertiary }]}>
                    Sponsorships, direct messages, and more
                  </Text>
                </View>
              </View>
              <Chevron color={brandColors.copper} />
            </TouchableOpacity>
          </View>
        )}

        {/* Settings items */}
        <View style={styles.sectionContent}>
          <HCard>
            {items.map((item, i) => (
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
                  {!item.toggle && <Chevron color={colors.borderThin} />}
                </View>
              </TouchableOpacity>
            ))}
          </HCard>
        </View>

        {/* Log Out */}
        <View style={styles.sectionContent}>
          <HCard>
            <TouchableOpacity style={styles.settingsItem} onPress={handleLogout}>
              <Text style={[styles.itemLabel, { color: brandColors.red }]}>Log Out</Text>
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
    fontSize: 14,
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
  upgradeBanner: {
    borderWidth: borders.thick,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  upgradeBannerTitle: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  upgradeBannerDesc: {
    fontFamily: mono,
    fontSize: 11,
    marginTop: 2,
  },
  spacer: { height: 32 },
});
