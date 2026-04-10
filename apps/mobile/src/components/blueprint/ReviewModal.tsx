import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, Alert, StyleSheet, Modal, Platform,
  ActivityIndicator, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { expeditionApi, sponsorshipApi, paymentMethodApi } from '@/services/api';
import type { PaymentMethodInfo } from '@/services/api';
import { StarRating } from '@/components/ui/StarRating';
import { mono, heading, colors as brandColors, borders } from '@/theme/tokens';
import { Svg, Path } from 'react-native-svg';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  blueprintId: string;
  blueprintTitle: string;
  guideUsername: string;
  guideName?: string;
  guideStripeConnected?: boolean;
  hasReviewed?: boolean;
  onSubmitted?: () => void;
}

export function ReviewModal({
  visible,
  onClose,
  blueprintId,
  blueprintTitle,
  guideUsername,
  guideName,
  guideStripeConnected,
  hasReviewed,
  onSubmitted,
}: ReviewModalProps) {
  const { colors } = useTheme();
  const { confirmSetupIntent } = useStripe();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [savedCard, setSavedCard] = useState<PaymentMethodInfo | null>(null);
  const [showCardField, setShowCardField] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load saved payment method
  useEffect(() => {
    if (!visible || !guideStripeConnected) return;
    paymentMethodApi.getAll()
      .then(res => {
        const cards = res.data ?? [];
        if (cards.length > 0) setSavedCard(cards.find(c => c.isDefault) ?? cards[0]);
      })
      .catch(() => {});
  }, [visible, guideStripeConnected]);

  const reset = () => {
    setRating(0);
    setReviewText('');
    setTipAmount('');
    setShowCardField(false);
    setCardComplete(false);
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!hasReviewed && rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating.');
      return;
    }
    const tipValue = tipAmount ? parseFloat(tipAmount) : 0;
    if (hasReviewed && tipValue === 0) {
      Alert.alert('Tip Required', 'Enter a tip amount to send.');
      return;
    }
    if (tipValue > 0 && (tipValue < 5 || tipValue > 100)) {
      Alert.alert('Invalid Tip', 'Tip must be between $5 and $100.');
      return;
    }
    if (tipValue > 0 && !savedCard && !showCardField) {
      setShowCardField(true);
      return;
    }

    setSubmitting(true);
    try {
      // Submit review (only if not already reviewed)
      if (!hasReviewed) {
        await expeditionApi.createReview(blueprintId, {
          rating,
          text: reviewText.trim() || undefined,
        });
      }

      // Submit tip if entered
      if (tipValue >= 5 && guideStripeConnected) {
        if (!savedCard && showCardField) {
          // Need to set up card first
          const setupRes = await paymentMethodApi.createSetupIntent();
          const { error, setupIntent } = await confirmSetupIntent(setupRes.clientSecret, {
            paymentMethodType: 'Card',
          });
          if (error) {
            Alert.alert('Card Error', error.message);
            setSubmitting(false);
            return;
          }
          if (setupIntent?.paymentMethodId) {
            await paymentMethodApi.create(setupIntent.paymentMethodId);
          }
          // Now checkout with new card
          await sponsorshipApi.checkout({
            sponsorshipType: 'tip',
            creatorId: guideUsername,
            oneTimePaymentAmount: tipValue,
            sponsorshipTierId: '',
            stripePaymentMethodId: setupIntent?.paymentMethodId ?? undefined,
          });
        } else if (savedCard) {
          await sponsorshipApi.checkout({
            sponsorshipType: 'tip',
            creatorId: guideUsername,
            oneTimePaymentAmount: tipValue,
            sponsorshipTierId: '',
            paymentMethodId: savedCard.id,
          });
        }
      }

      Alert.alert('Thank You', 'Your review has been submitted.');
      reset();
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting, rating, reviewText, tipAmount, savedCard, showCardField,
    blueprintId, guideUsername, guideStripeConnected, confirmSetupIntent,
    onSubmitted, onClose,
  ]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{hasReviewed ? 'TIP GUIDE' : 'RATE & REVIEW'}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Blueprint title */}
          <Text style={[styles.blueprintTitle, { color: colors.text }]} numberOfLines={2}>
            {blueprintTitle}
          </Text>

          {/* Rating & Review — hidden if already reviewed */}
          {!hasReviewed && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>YOUR RATING</Text>
              <View style={styles.ratingWrap}>
                <StarRating rating={rating} size={32} interactive onRatingChange={setRating} />
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>REVIEW (OPTIONAL)</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                placeholder="Share your experience with this blueprint..."
                placeholderTextColor={colors.textTertiary}
                value={reviewText}
                onChangeText={setReviewText}
                maxLength={2000}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: colors.textTertiary }]}>
                {reviewText.length}/2000
              </Text>
            </>
          )}

          {/* Tip section — hidden on iOS per App Store Guideline 3.1.1 */}
          {Platform.OS !== 'ios' && guideStripeConnected && (
            <View style={[styles.tipSection, { borderColor: brandColors.green }]}>
              <Text style={[styles.tipTitle, { color: brandColors.green }]}>
                TIP {(guideName || guideUsername).toUpperCase()} (OPTIONAL)
              </Text>
              <Text style={[styles.tipDesc, { color: colors.textSecondary }]}>
                Show your appreciation to the guide who created this blueprint.
              </Text>
              <View style={styles.tipInputRow}>
                <Text style={[styles.tipCurrency, { color: colors.text }]}>$</Text>
                <TextInput
                  style={[styles.tipInput, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  placeholder="5 - 100"
                  placeholderTextColor={colors.textTertiary}
                  value={tipAmount}
                  onChangeText={(t) => setTipAmount(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
              </View>

              {savedCard && !showCardField && (
                <View style={styles.savedCardRow}>
                  <Text style={[styles.savedCardLabel, { color: colors.textSecondary }]}>
                    Card: •••• {savedCard.last4}
                  </Text>
                </View>
              )}

              {showCardField && (
                <View style={styles.cardFieldWrap}>
                  <CardField
                    style={styles.cardField}
                    postalCodeEnabled={false}
                    onCardChange={(details) => setCardComplete(details.complete)}
                  />
                  <View style={styles.secureBadge}>
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={brandColors.green} strokeWidth={2}>
                      <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </Svg>
                    <Text style={[styles.secureText, { color: colors.textTertiary }]}>Secure payment via Stripe</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Bottom actions */}
        <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <Pressable style={[styles.skipBtn, { borderColor: colors.border }]} onPress={onClose}>
            <Text style={[styles.skipText, { color: colors.textTertiary }]}>SKIP</Text>
          </Pressable>
          <Pressable
            style={[styles.submitBtn, { backgroundColor: brandColors.green, opacity: submitting || (!hasReviewed && rating === 0) ? 0.5 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting || (!hasReviewed && rating === 0)}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitText}>{hasReviewed ? 'SEND TIP' : 'SUBMIT'}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: borders.thick,
  },
  headerTitle: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  blueprintTitle: {
    fontFamily: heading,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  ratingWrap: {
    marginBottom: 20,
  },
  textArea: {
    fontFamily: heading,
    fontSize: 14,
    lineHeight: 20,
    borderWidth: borders.thin,
    padding: 12,
    minHeight: 100,
  },
  charCount: {
    fontFamily: mono,
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 20,
  },
  tipSection: {
    borderWidth: borders.thin,
    padding: 14,
    marginTop: 4,
  },
  tipTitle: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tipDesc: {
    fontFamily: mono,
    fontSize: 12,
    marginBottom: 12,
  },
  tipInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipCurrency: {
    fontFamily: mono,
    fontSize: 18,
    fontWeight: '700',
  },
  tipInput: {
    fontFamily: mono,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: borders.thin,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
  },
  savedCardRow: {
    marginTop: 10,
  },
  savedCardLabel: {
    fontFamily: mono,
    fontSize: 12,
  },
  cardFieldWrap: {
    marginTop: 12,
  },
  cardField: {
    height: 50,
    width: '100%',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  secureText: {
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: borders.thin,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: borders.thin,
  },
  skipText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#ffffff',
  },
});
