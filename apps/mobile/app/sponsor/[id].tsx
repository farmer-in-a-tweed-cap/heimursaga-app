import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HButton } from '@/components/ui/HButton';
import { Avatar } from '@/components/ui/Avatar';
import { FundingBar } from '@/components/ui/FundingBar';
import { Checkbox } from '@/components/ui/Checkbox';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Svg, Path, Rect } from 'react-native-svg';
import { sponsorshipApi } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';

const AMOUNTS = [10, 25, 50, 100];

export default function SponsorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const { data: expedition, loading } = useApi<Expedition>(
    id ? `/trips/${id}` : null,
  );

  const [type, setType] = useState(0); // 0=one-time, 1=monthly
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [showName, setShowName] = useState(true);
  const [showMessage, setShowMessage] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const parsedCustom = customAmount ? parseFloat(customAmount.replace(/[^0-9.]/g, '')) : NaN;
  const activeAmount = !isNaN(parsedCustom) && parsedCustom > 0 ? parsedCustom : selectedAmount;

  const handleSponsor = useCallback(async () => {
    if (!id) return;
    if (!activeAmount || isNaN(activeAmount) || activeAmount <= 0 || activeAmount > 10000) {
      Alert.alert('Invalid amount', 'Please enter an amount between $1 and $10,000.');
      return;
    }
    setSubmitting(true);
    try {
      const tripId = Array.isArray(id) ? id[0] : id;
      const res = await sponsorshipApi.checkout({
        trip_id: tripId,
        amount: Math.round(activeAmount * 100),
        type: type === 0 ? 'one_time' : 'monthly',
        message: message.trim() || undefined,
        show_name: showName,
        show_message: showMessage,
      });
      const url = res.data.url;
      if (url && url.startsWith('https://')) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Invalid checkout URL received.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to start checkout');
    } finally {
      setSubmitting(false);
    }
  }, [id, activeAmount, type, message, showName, showMessage]);

  if (!ready || loading || !expedition) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="SPONSOR" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="SPONSOR" />

      <ScrollView>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Support This Expedition</Text>
            <View style={[styles.titleLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Explorer info */}
          <View style={styles.explorerRow}>
            <Avatar size={36} name={expedition.author?.username ?? 'Explorer'} />
            <View>
              <Text style={styles.explorerName}>{expedition.author?.username}</Text>
              <Text style={[styles.expeditionTitle, { color: colors.text }]}>{expedition.title}</Text>
            </View>
          </View>

          {/* Funding bar */}
          {expedition.goal && expedition.goal > 0 && (
            <HCard>
              <View style={styles.fundingCard}>
                <FundingBar
                  raised={expedition.raised ?? 0}
                  goal={expedition.goal}
                />
                <Text style={[styles.sponsorCount, { color: colors.textTertiary }]}>
                  {expedition.sponsorsCount ?? 0} sponsors
                </Text>
              </View>
            </HCard>
          )}

          {/* Type */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>SPONSORSHIP TYPE</Text>
            <View style={[styles.labelLine, { backgroundColor: colors.border }]} />
            <SegmentedControl
              options={['ONE-TIME', 'MONTHLY']}
              active={type}
              onSelect={setType}
            />
          </View>

          {/* Amount */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT AMOUNT</Text>
            <View style={[styles.labelLine, { backgroundColor: colors.border }]} />
            <View style={[styles.amountGrid, { borderColor: colors.border }]}>
              {AMOUNTS.map((amt, i) => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.amountBtn,
                    {
                      backgroundColor: selectedAmount === amt && !customAmount ? brandColors.copper : colors.card,
                      borderLeftWidth: i > 0 ? borders.thick : 0,
                      borderLeftColor: colors.border,
                    },
                  ]}
                  onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                >
                  <Text
                    style={[
                      styles.amountText,
                      { color: selectedAmount === amt && !customAmount ? '#fff' : colors.textTertiary },
                    ]}
                  >
                    ${amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.customRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.dollarSign, { color: colors.textTertiary }]}>$</Text>
              <TextInput
                style={[styles.customInput, { color: colors.text }]}
                placeholder="Custom amount"
                placeholderTextColor={colors.textTertiary}
                value={customAmount}
                onChangeText={setCustomAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Message */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>MESSAGE (OPTIONAL)</Text>
            <TextInput
              style={[styles.messageInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              multiline
              placeholder="Good luck on the journey!"
              placeholderTextColor={colors.textTertiary}
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />
          </View>

          {/* Checkboxes */}
          <View style={styles.checkboxes}>
            <Checkbox label="Show my name publicly" checked={showName} onChange={setShowName} />
            <Checkbox label="Show my message publicly" checked={showMessage} onChange={setShowMessage} />
          </View>

          {/* Sponsor button */}
          <HButton variant="copper" onPress={handleSponsor} disabled={submitting}>
            {submitting ? 'PROCESSING...' : `SPONSOR $${activeAmount.toFixed(2)}`}
          </HButton>

          {/* Security message */}
          <View style={styles.securityRow}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
              <Rect x={3} y={11} width={18} height={11} rx={0} />
              <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </Svg>
            <Text style={[styles.securityText, { color: colors.textTertiary }]}>
              Secure payment via Stripe · Apple Pay available
            </Text>
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
  content: { padding: 16 },
  titleRow: { marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700' },
  titleLine: { height: 2, marginTop: 8 },
  explorerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  explorerName: { fontSize: 12, color: brandColors.copper, fontWeight: '600' },
  expeditionTitle: { fontSize: 14, fontWeight: '700' },
  fundingCard: { padding: 12, paddingHorizontal: 14, marginBottom: 16 },
  sponsorCount: { fontFamily: mono, fontSize: 10, fontWeight: '600', marginTop: 6 },
  fieldGroup: { marginBottom: 16 },
  label: { fontFamily: mono, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  labelLine: { height: 2, marginBottom: 10 },
  amountGrid: { flexDirection: 'row', borderWidth: borders.thick },
  amountBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  amountText: { fontFamily: mono, fontSize: 15, fontWeight: '700' },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: borders.thick,
    marginTop: 8,
  },
  dollarSign: { fontFamily: mono, fontSize: 15, fontWeight: '700' },
  customInput: { flex: 1, fontSize: 14 },
  messageInput: {
    borderWidth: borders.thick,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 72,
  },
  checkboxes: { marginBottom: 24 },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  securityText: { fontFamily: mono, fontSize: 12, fontWeight: '600' },
  spacer: { height: 32 },
});
