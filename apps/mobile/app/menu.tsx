import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Svg, Path, Circle, Line, Rect, Polyline, Polygon } from 'react-native-svg';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import { notificationsApi, messagesApi } from '@/services/api';

interface MenuItem {
  label: string;
  detail?: string;
  route?: string;
  accent?: string;
  badge?: number;
  icon: React.ReactNode;
}

export default function MenuScreen() {
  const { dark, colors } = useTheme();
  const { user, logout, biometricEnabled, biometricAvailable, setBiometricEnabled } = useAuth();
  const router = useRouter();
  const [messageBadge, setMessageBadge] = useState(0);

  useEffect(() => {
    if (user) {
      messagesApi.getUnreadCount()
        .then((res) => setMessageBadge(res.data.count))
        .catch(() => {});
    }
  }, [user]);

  const iconColor = dark ? '#616161' : '#b5bcc4';

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'NAVIGATION',
      items: [
        {
          label: 'Bookmarks',
          detail: 'Saved items',
          route: '/bookmarks',
          icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.5}><Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Svg>,
        },
        {
          label: 'Messages',
          detail: messageBadge > 0 ? `${messageBadge} unread` : 'Conversations',
          route: '/messages',
          badge: messageBadge,
          icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.5}><Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>,
        },
        {
          label: 'Sponsorships',
          detail: 'Manage & track',
          route: '/sponsorships',
          accent: brandColors.green,
          icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={brandColors.green} strokeWidth={1.5}><Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></Svg>,
        },
        {
          label: 'Expedition Builder',
          detail: 'Plan a new expedition',
          route: '/expedition/create',
          accent: brandColors.blue,
          icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={brandColors.blue} strokeWidth={1.5}><Polygon points="12 2 2 7 12 12 22 7 12 2" /><Polyline points="2 17 12 22 22 17" /><Polyline points="2 12 12 17 22 12" /></Svg>,
        },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        {
          label: 'Edit Profile',
          detail: 'Username, bio, avatar',
          route: '/settings/profile',
          icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.5}><Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><Circle cx={12} cy={7} r={4} /></Svg>,
        },
        {
          label: 'Settings',
          detail: 'Notifications, privacy, billing',
          route: '/settings/index',
          icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.5}><Circle cx={12} cy={12} r={3} /><Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Svg>,
        },
      ],
    },
    {
      title: 'MORE',
      items: [
        {
          label: 'About Heimursaga',
          route: undefined,
          icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.5}><Circle cx={12} cy={12} r={10} /><Line x1={12} y1={16} x2={12} y2={12} /><Line x1={12} y1={8} x2={12.01} y2={8} /></Svg>,
        },
        {
          label: 'Log Out',
          accent: brandColors.red,
          icon: <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={brandColors.red} strokeWidth={1.5}><Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><Polyline points="16 17 21 12 16 7" /><Line x1={21} y1={12} x2={9} y2={12} /></Svg>,
        },
      ],
    },
  ];

  const handleItemPress = (item: MenuItem) => {
    if (item.label === 'Log Out') {
      logout().then(() => router.replace('/(auth)/login'));
      return;
    }
    if (item.route) {
      router.replace(item.route as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="MENU" />

      <ScrollView>
        {/* User card */}
        <View style={styles.userCardWrap}>
          <HCard>
            <TouchableOpacity
              style={styles.userCard}
              onPress={() => router.replace('/(tabs)/profile')}
            >
              <Avatar size={48} name={user?.username ?? 'U'} pro={user?.is_pro} />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.text }]}>
                  {user?.display_name ?? user?.username ?? 'Explorer'}
                </Text>
                {user?.is_pro && (
                  <Text style={styles.proBadge}>EXPLORER PRO</Text>
                )}
              </View>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Polyline points="9 18 15 12 9 6" />
              </Svg>
            </TouchableOpacity>
          </HCard>
        </View>

        {/* Sections */}
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
                      styles.menuItem,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                    ]}
                    onPress={() => handleItemPress(item)}
                  >
                    <View style={styles.menuIcon}>{item.icon}</View>
                    <View style={styles.menuText}>
                      <Text style={[styles.menuLabel, { color: item.accent ?? colors.text }]}>
                        {item.label}
                      </Text>
                      {item.detail && (
                        <Text style={[styles.menuDetail, { color: colors.textTertiary }]}>
                          {item.detail}
                        </Text>
                      )}
                    </View>
                    {item.badge != null && item.badge > 0 && <Badge count={item.badge} size={18} />}
                    {item.route && (
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.borderThin} strokeWidth={2}>
                        <Polyline points="9 18 15 12 9 6" />
                      </Svg>
                    )}
                  </TouchableOpacity>
                ))}
              </HCard>
            </View>
          </View>
        ))}

        {/* Biometric toggle */}
        {biometricAvailable && (
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={[styles.biometricRow, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setBiometricEnabled(!biometricEnabled)}
            >
              <Text style={[styles.menuLabel, { color: colors.text }]}>
                Face ID / Touch ID Lock
              </Text>
              <View style={[styles.toggle, biometricEnabled && styles.toggleActive]}>
                <View style={[styles.toggleKnob, biometricEnabled && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  userCardWrap: {
    padding: 16,
  },
  userCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
  },
  proBadge: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: brandColors.copper,
    marginTop: 3,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionLine: {
    height: 2,
    marginTop: 4,
  },
  sectionContent: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuIcon: {
    flexShrink: 0,
  },
  menuText: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuDetail: {
    fontSize: 13,
    marginTop: 1,
  },
  biometricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderWidth: borders.thick,
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#616161',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: brandColors.green,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  spacer: { height: 32 },
});
