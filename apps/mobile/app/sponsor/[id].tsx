import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePaymentSheet } from '@stripe/stripe-react-native';
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
import { sponsorshipApi, explorerApi } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition, SponsorshipTier } from '@/types/api';
import { getPerksForSlot, getTierLabel, getTierSlotConfig, ONE_TIME_TIER_SLOTS, MONTHLY_TIER_SLOTS } from '@repo/types/sponsorship-tiers';

const PRESET_AMOUNTS = [10, 25, 50, 100];

export default function SponsorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { initPaymentSheet, presentPaymentSheet } = usePaymentSheet();

  const { data: expedition, loading } = useApi<Expedition>(
    id ? `/trips/${id}` : null,
  );

  // Tiers
  const [tiers, setTiers] = useState<SponsorshipTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);

  useEffect(() => {
    if (!expedition?.author?.username) return;
    setTiersLoading(true);
    explorerApi.getTiers(expedition.author.username)
      .then(res => setTiers(res.data ?? []))
      .catch(() => setTiers([]))
      .finally(() => setTiersLoading(false));
  }, [expedition?.author?.username]);

  const oneTimeTiers = tiers.filter(t => t.isAvailable !== false && t.type === 'ONE_TIME');
  const monthlyTiers = tiers.filter(t => t.isAvailable !== false && t.type === 'MONTHLY');

  // Form state
  const [paymentType, setPaymentType] = useState(0); // 0=one-time, 1=monthly
  const [selectedTier, setSelectedTier] = useState<SponsorshipTier | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isMessagePublic, setIsMessagePublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Auto-select first available tier when tiers load or type changes
  const currentTiers = paymentType === 0 ? oneTimeTiers : monthlyTiers;
  useEffect(() => {
    if (currentTiers.length > 0 && !selectedTier) {
      setSelectedTier(currentTiers[0]);
    }
  }, [currentTiers, paymentType]);

  // Reset tier selection when switching payment type
  const handleTypeChange = useCallback((idx: number) => {
    setPaymentType(idx);
    setSelectedTier(null);
    setCustomAmount('');
  }, []);

  // Compute active amount
  const parsedCustom = customAmount ? parseFloat(customAmount.replace(/[^0-9.]/g, '')) : NaN;
  const activeAmount = paymentType === 1 && selectedTier
    ? selectedTier.price
    : !isNaN(parsedCustom) && parsedCustom > 0
      ? parsedCustom
      : selectedAmount;

  const handleSponsor = useCallback(async () => {
    if (!id || !expedition?.author?.username) return;

    // Determine tier
    const tier = selectedTier || currentTiers[0];
    if (!tier) {
      Alert.alert('Unavailable', 'This explorer has no sponsorship tiers configured yet.');
      return;
    }

    // Validate amount
    if (paymentType === 0 && (activeAmount < 5 || activeAmount > 10000)) {
      Alert.alert('Invalid Amount', 'Sponsorship amount must be between $5 and $10,000.');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Prepare checkout — get PaymentSheet params from API
      const prepared = await sponsorshipApi.prepareCheckout({
        sponsorshipType: paymentType === 0 ? 'one_time_payment' : 'subscription',
        creatorId: expedition.author.username,
        sponsorshipTierId: tier.id,
        oneTimePaymentAmount: paymentType === 0 ? activeAmount : undefined,
        billingPeriod: paymentType === 1 ? 'monthly' : undefined,
        message: message.trim() || undefined,
        isPublic,
        isMessagePublic,
        expeditionId: Array.isArray(id) ? id[0] : id,
      });

      // Step 2: Initialise PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: prepared.clientSecret,
        customerEphemeralKeySecret: prepared.ephemeralKey,
        customerId: prepared.customerId,
        merchantDisplayName: 'Heimursaga',
        applePay: { merchantCountryCode: 'US' },
        googlePay: { merchantCountryCode: 'US', testEnv: __DEV__ },
        returnURL: 'heimursaga://stripe-redirect',
      });

      if (initError) {
        Alert.alert('Payment Error', initError.message);
        return;
      }

      // Step 3: Present PaymentSheet (Apple Pay / card entry)
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // User cancelled — not an error
        if (presentError.code === 'Canceled') return;
        Alert.alert('Payment Failed', presentError.message);
        return;
      }

      // Step 4: Payment succeeded — notify backend (webhook fallback)
      const paymentIntentId = prepared.paymentIntentId;
      try {
        await sponsorshipApi.completeCheckout(paymentIntentId);
      } catch (err) {
        // Non-critical — webhook will handle it
        if (__DEV__) console.error('[Sponsor] completeCheckout error:', err);
      }

      // Step 5: Success
      Alert.alert(
        'Sponsorship Successful',
        `Thank you for sponsoring ${expedition.author.username}!`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process sponsorship.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [id, expedition, selectedTier, currentTiers, paymentType, activeAmount, message, isPublic, isMessagePublic, initPaymentSheet, presentPaymentSheet, router]);

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

      <ScrollView keyboardShouldPersistTaps="handled">
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
          {expedition.goal != null && expedition.goal > 0 && (
            <HCard>
              <View style={styles.fundingCard}>
                <FundingBar
                  raised={(expedition.raised ?? 0) + (expedition.recurringStats?.totalCommitted ?? 0)}
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
              active={paymentType}
              onSelect={handleTypeChange}
            />
          </View>

          {/* Amount selection — one-time shows preset amounts, monthly shows tier prices */}
          {paymentType === 0 ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT AMOUNT</Text>
              <View style={[styles.labelLine, { backgroundColor: colors.border }]} />
              <View style={[styles.amountGrid, { borderColor: colors.border }]}>
                {PRESET_AMOUNTS.map((amt, i) => (
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
                  placeholder="Custom amount (min $5)"
                  placeholderTextColor={colors.textTertiary}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          ) : (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>SELECT TIER</Text>
              <View style={[styles.labelLine, { backgroundColor: colors.border }]} />
              {tiersLoading ? (
                <ActivityIndicator color={brandColors.copper} style={{ paddingVertical: 16 }} />
              ) : monthlyTiers.length === 0 ? (
                <Text style={[styles.emptyTiers, { color: colors.textTertiary }]}>
                  No monthly tiers available for this explorer.
                </Text>
              ) : (
                monthlyTiers.map(tier => (
                  <TouchableOpacity
                    key={tier.id}
                    style={[
                      styles.tierCard,
                      {
                        borderColor: selectedTier?.id === tier.id ? brandColors.copper : colors.border,
                        backgroundColor: selectedTier?.id === tier.id ? `${brandColors.copper}15` : colors.card,
                      },
                    ]}
                    onPress={() => setSelectedTier(tier)}
                  >
                    <Text style={[styles.tierPrice, { color: selectedTier?.id === tier.id ? brandColors.copper : colors.text }]}>
                      ${tier.price}/mo
                    </Text>
                    <Text style={[styles.tierLabel, { color: brandColors.copper }]}>
                      {getTierLabel('MONTHLY', tier.priority ?? 1)}
                    </Text>
                    {(() => {
                      const config = getTierSlotConfig('MONTHLY', tier.priority ?? 1);
                      return config ? (
                        <Text style={[styles.tierRange, { color: colors.textTertiary }]}>
                          ${config.minPrice}{config.maxPrice ? `–$${config.maxPrice}` : '+'}/mo
                        </Text>
                      ) : null;
                    })()}
                    <View style={[styles.perksContainer, { borderTopColor: `${colors.border}60` }]}>
                      {getPerksForSlot('MONTHLY', tier.priority ?? 1).map((perk, i) => (
                        <View key={i} style={styles.perkRow}>
                          <Text style={styles.perkCheck}>*</Text>
                          <Text style={[styles.perkText, { color: colors.textSecondary }]}>{perk}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Perks summary for one-time */}
          {paymentType === 0 && (
            <View style={[styles.perksBox, { borderColor: brandColors.blue }]}>
              <Text style={[styles.perksBoxTitle, { color: brandColors.blue }]}>YOUR PERKS:</Text>
              {getPerksForSlot('ONE_TIME', activeAmount >= 75 ? 3 : activeAmount >= 25 ? 2 : 1).map((perk, i) => (
                <View key={i} style={styles.perkRow}>
                  <Text style={styles.perkCheck}>*</Text>
                  <Text style={[styles.perkText, { color: colors.text }]}>{perk}</Text>
                </View>
              ))}
            </View>
          )}

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
              maxLength={500}
            />
          </View>

          {/* Checkboxes */}
          <View style={styles.checkboxes}>
            <Checkbox label="Show my name publicly" checked={isPublic} onChange={setIsPublic} />
            <Checkbox label="Show my message publicly" checked={isMessagePublic} onChange={setIsMessagePublic} />
          </View>

          {/* Sponsor button */}
          <HButton
            variant="copper"
            onPress={handleSponsor}
            disabled={submitting || (paymentType === 1 && monthlyTiers.length === 0)}
          >
            {submitting ? 'PROCESSING...' : `SPONSOR $${activeAmount.toFixed(2)}${paymentType === 1 ? '/MO' : ''}`}
          </HButton>

          {/* Security message */}
          <View style={styles.securityRow}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
              <Rect x={3} y={11} width={18} height={11} rx={0} />
              <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </Svg>
            <Text style={[styles.securityText, { color: colors.textTertiary }]}>
              Secure payment via Stripe
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
  tierCard: {
    borderWidth: borders.thick,
    padding: 14,
    marginBottom: 8,
  },
  tierPrice: { fontFamily: mono, fontSize: 16, fontWeight: '700' },
  tierLabel: { fontFamily: mono, fontSize: 11, fontWeight: '700', marginTop: 2 },
  tierRange: { fontFamily: mono, fontSize: 10, marginTop: 2 },
  emptyTiers: { fontFamily: mono, fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  perksContainer: { borderTopWidth: 1, marginTop: 8, paddingTop: 6 },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 2 },
  perkCheck: { fontFamily: mono, fontSize: 10, color: '#598636', fontWeight: '700' },
  perkText: { fontFamily: mono, fontSize: 10, flex: 1 },
  perksBox: { borderWidth: 2, padding: 12, marginBottom: 16 },
  perksBoxTitle: { fontFamily: mono, fontSize: 11, fontWeight: '700', marginBottom: 6 },
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
