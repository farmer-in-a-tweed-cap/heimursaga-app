import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HButton } from '@/components/ui/HButton';
import { mono, colors as brandColors } from '@/theme/tokens';

export default function BillingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user } = useAuth();

  if (!ready || !user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="BILLING" />

      <ScrollView>
        <View style={styles.content}>
          <HCard>
            <View style={styles.planRow}>
              <Text style={[styles.planLabel, { color: colors.textTertiary }]}>CURRENT PLAN</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>
                {user.is_pro ? 'Explorer Pro' : 'Free'}
              </Text>
              {user.is_pro && (
                <Text style={styles.proBadge}>ACTIVE</Text>
              )}
            </View>
          </HCard>

          <View style={styles.manageSection}>
            <Text style={[styles.manageNote, { color: colors.textTertiary }]}>
              Billing is managed through the web app. Tap below to manage your subscription, update payment methods, or view invoices.
            </Text>
            <HButton
              variant="copper"
              onPress={() => Linking.openURL('https://heimursaga.com/settings/billing')}
            >
              MANAGE ON WEB
            </HButton>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  planRow: {
    padding: 14,
  },
  planLabel: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  planValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  proBadge: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.green,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  manageSection: {
    marginTop: 20,
  },
  manageNote: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
});
