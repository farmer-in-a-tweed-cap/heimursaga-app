import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CardField, useStripe } from '@stripe/stripe-react-native';
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

const PRESET_AMOUNTS = [10, 25, 50, 100];

export default function SponsorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { createPaymentMethod, confirmPayment, confirmSetupIntent } = useStripe();

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
  const [cardComplete, setCardComplete] = useState(false);
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

    if (!cardComplete) {
      Alert.alert('Card Required', 'Please enter your card details.');
      return;
    }

    setSubmitting(true);
    try {
      // Step 1: Create a Stripe PaymentMethod from the card field
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (pmError || !paymentMethod) {
        Alert.alert('Card Error', pmError?.message ?? 'Failed to process card.');
        return;
      }

      // Step 2: Call API checkout with correct payload
      const checkout = await sponsorshipApi.checkout({
        sponsorshipType: paymentType === 0 ? 'one_time_payment' : 'subscription',
        creatorId: expedition.author.username,
        sponsorshipTierId: tier.id,
        stripePaymentMethodId: paymentMethod.id,
        oneTimePaymentAmount: paymentType === 0 ? activeAmount : undefined,
        billingPeriod: paymentType === 1 ? 'monthly' : undefined,
        message: message.trim() || undefined,
        isPublic,
        isMessagePublic,
        expeditionId: Array.isArray(id) ? id[0] : id,
      });

      // Step 3: Confirm payment — subscriptions use SetupIntent, one-time uses PaymentIntent
      if (paymentType === 1) {
        // Subscription: confirm SetupIntent to attach payment method for recurring billing
        const { error: confirmError } = await confirmSetupIntent(
          checkout.clientSecret,
          { paymentMethodType: 'Card' },
        );
        if (confirmError) {
          Alert.alert('Payment Failed', confirmError.message);
          return;
        }
      } else {
        // One-time: confirm PaymentIntent for immediate charge
        const { error: confirmError, paymentIntent } = await confirmPayment(
          checkout.clientSecret,
          { paymentMethodType: 'Card' },
        );
        if (confirmError) {
          Alert.alert('Payment Failed', confirmError.message);
          return;
        }
        // Complete checkout on backend (webhook fallback)
        if (paymentIntent?.id) {
          try {
            await sponsorshipApi.completeCheckout(paymentIntent.id);
          } catch {
            // Non-critical — webhook will handle it
          }
        }
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
  }, [id, expedition, selectedTier, currentTiers, paymentType, activeAmount, cardComplete, message, isPublic, isMessagePublic, createPaymentMethod, confirmPayment, confirmSetupIntent, router]);

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
                    {tier.description ? (
                      <Text style={[styles.tierDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {tier.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Card input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>PAYMENT METHOD</Text>
            <View style={[styles.labelLine, { backgroundColor: colors.border }]} />
            <CardField
              postalCodeEnabled={false}
              placeholders={{ number: '4242 4242 4242 4242' }}
              cardStyle={{
                backgroundColor: colors.inputBackground,
                textColor: colors.text,
                borderColor: colors.border,
                borderWidth: 2,
                borderRadius: 0,
                fontSize: 14,
                placeholderColor: colors.textTertiary,
              }}
              style={styles.cardField}
              onCardChange={(details) => setCardComplete(details.complete)}
            />
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
            <Checkbox label="Show my name publicly" checked={isPublic} onChange={setIsPublic} />
            <Checkbox label="Show my message publicly" checked={isMessagePublic} onChange={setIsMessagePublic} />
          </View>

          {/* Sponsor button */}
          <HButton
            variant="copper"
            onPress={handleSponsor}
            disabled={submitting || !cardComplete || (paymentType === 1 && monthlyTiers.length === 0)}
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
  tierDesc: { fontFamily: mono, fontSize: 12, marginTop: 4 },
  emptyTiers: { fontFamily: mono, fontSize: 12, textAlign: 'center', paddingVertical: 16 },
  cardField: { width: '100%', height: 50 },
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
