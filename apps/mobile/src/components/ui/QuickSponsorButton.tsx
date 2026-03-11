import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, Alert, StyleSheet, Modal, ActivityIndicator,
} from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { sponsorshipApi, paymentMethodApi, type PaymentMethodInfo } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import { Svg, Path, Rect } from 'react-native-svg';

interface QuickSponsorButtonProps {
  entryId: string;
  authorUsername: string;
  onSuccess?: () => void;
}

const COOLDOWN_MS = 30_000;

export function QuickSponsorButton({ entryId, authorUsername, onSuccess }: QuickSponsorButtonProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { confirmSetupIntent } = useStripe();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Saved payment method
  const [savedCard, setSavedCard] = useState<PaymentMethodInfo | null>(null);
  // Card modal state (for new card entry)
  const [showCardModal, setShowCardModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);

  // Clean up cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  // Fetch saved cards on mount — prefer default, fall back to first
  useEffect(() => {
    if (!user) return;
    paymentMethodApi.getAll()
      .then(res => {
        const cards = res.data ?? [];
        if (cards.length > 0) {
          setSavedCard(cards.find(c => c.isDefault) ?? cards[0]);
        }
      })
      .catch(() => {});
  }, [user]);

  const startCooldown = useCallback(() => {
    setCooldown(true);
    cooldownTimer.current = setTimeout(() => setCooldown(false), COOLDOWN_MS);
  }, []);

  const handleSuccess = useCallback(() => {
    startCooldown();
    setShowCardModal(false);
    Alert.alert('Sent!', `$3 quick sponsor sent to ${authorUsername}.`);
    onSuccess?.();
  }, [authorUsername, startCooldown, onSuccess]);

  const handleQuickSponsor = useCallback(async () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    if (loading || cooldown || showCardModal) return;

    const cardInfo = savedCard
      ? `\nUsing ${savedCard.label} ending in ${savedCard.last4}.`
      : '\nYou\'ll be prompted to add a payment method.';

    Alert.alert(
      'Quick Sponsor $3',
      `Send a $3 micro-sponsorship to ${authorUsername}?${cardInfo}\n\nExplorer receives $2.70 after fees.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await sponsorshipApi.quickSponsor(entryId);

              if (res.requiresPaymentMethod && res.clientSecret) {
                // No saved card — open card input modal
                setClientSecret(res.clientSecret);
                setShowCardModal(true);
                setLoading(false);
                return;
              }

              if (res.success) {
                handleSuccess();
              }
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Quick sponsor failed.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [user, loading, cooldown, showCardModal, entryId, authorUsername, savedCard, handleSuccess, router]);

  // Handle card submission in the modal
  const handleCardSubmit = useCallback(async () => {
    if (!clientSecret || cardLoading) return;
    setCardLoading(true);

    try {
      const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Card Error', error.message);
        setCardLoading(false);
        return;
      }

      if (setupIntent?.status !== 'Succeeded') {
        Alert.alert('Error', 'Card setup was not completed.');
        setCardLoading(false);
        return;
      }

      // Confirm the quick sponsor with the newly saved card
      const result = await sponsorshipApi.confirmQuickSponsor(setupIntent.id, entryId);

      if (result.success) {
        // Update saved card for future use
        paymentMethodApi.getAll()
          .then(res => {
            const cards = res.data ?? [];
            if (cards.length > 0) setSavedCard(cards.find(c => c.isDefault) ?? cards[0]);
          })
          .catch(() => {});
        handleSuccess();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to process payment.');
    } finally {
      setCardLoading(false);
    }
  }, [clientSecret, cardLoading, confirmSetupIntent, entryId, handleSuccess]);

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.textRow}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2}>
            <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </Svg>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Appreciate this entry? Show your support.
          </Text>
        </View>

        <Pressable
          style={[
            styles.button,
            {
              backgroundColor: cooldown ? colors.border : brandColors.blue,
              opacity: loading ? 0.6 : 1,
            },
          ]}
          onPress={handleQuickSponsor}
          disabled={loading || cooldown || showCardModal}
        >
          <Text style={styles.buttonText}>
            {loading ? 'SENDING...' : cooldown ? 'SENT' : 'QUICK SPONSOR $3'}
          </Text>
        </Pressable>
      </View>

      {/* Card input modal — shown when user has no saved payment method */}
      <Modal
        visible={showCardModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowCardModal(false); setClientSecret(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2}>
                <Rect x={1} y={4} width={22} height={16} rx={0} />
                <Path d="M1 10h22" />
              </Svg>
              <Text style={styles.modalHeaderText}>Add payment method</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                Add a card to complete your $3.00 sponsorship. Your card will be saved for future transactions.
              </Text>

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

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalBtn, { borderColor: colors.border }]}
                  onPress={() => { setShowCardModal(false); setClientSecret(null); }}
                >
                  <Text style={[styles.modalBtnText, { color: colors.text }]}>CANCEL</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnConfirm, { opacity: !cardComplete || cardLoading ? 0.5 : 1 }]}
                  onPress={handleCardSubmit}
                  disabled={!cardComplete || cardLoading}
                >
                  {cardLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalBtnConfirmText}>SAVE CARD & SPONSOR $3</Text>
                  )}
                </Pressable>
              </View>

              <View style={styles.securityRow}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                  <Rect x={3} y={11} width={18} height={11} rx={0} />
                  <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </Svg>
                <Text style={[styles.securityText, { color: colors.textTertiary }]}>
                  Secure payment via Stripe
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: borders.thick,
    padding: 14,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  label: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  button: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.6,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderWidth: borders.thick,
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: brandColors.copper,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalHeaderText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  modalBody: {
    padding: 20,
  },
  modalDesc: {
    fontFamily: mono,
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 16,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: borders.thick,
  },
  modalBtnText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  modalBtnConfirm: {
    backgroundColor: brandColors.copper,
    borderColor: brandColors.copper,
  },
  modalBtnConfirmText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 14,
  },
  securityText: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '600',
  },
});
