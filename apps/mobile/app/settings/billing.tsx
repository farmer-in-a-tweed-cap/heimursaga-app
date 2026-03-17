import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Svg, Path, Rect } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HButton } from '@/components/ui/HButton';
import {
  paymentMethodApi,
  ApiError,
  type PaymentMethodInfo,
} from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';

export default function BillingScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user } = useAuth();
  const { confirmSetupIntent } = useStripe();

  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [defaultingId, setDefaultingId] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    try {
      const res = await paymentMethodApi.getAll();
      setMethods(res.data ?? []);
    } catch {
      setMethods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && user) fetchMethods();
  }, [ready, user, fetchMethods]);

  const handleAddCard = useCallback(async () => {
    if (addingCard) return;
    setAddingCard(true);
    try {
      // 1. Create SetupIntent on backend
      const { clientSecret } = await paymentMethodApi.createSetupIntent();

      // 2. Confirm with Stripe SDK (card data collected by CardField)
      const { error, setupIntent } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Card Error', error.message);
        return;
      }

      if (!setupIntent?.paymentMethodId) {
        Alert.alert('Error', 'Card setup was not completed.');
        return;
      }

      // 3. Save payment method to backend
      await paymentMethodApi.create(setupIntent.paymentMethodId);
      setShowAddCard(false);
      setCardComplete(false);
      fetchMethods();
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setAddingCard(false);
    }
  }, [addingCard, confirmSetupIntent, fetchMethods]);

  const handleSetDefault = useCallback(async (id: string) => {
    setDefaultingId(id);
    try {
      await paymentMethodApi.setDefault(id);
      fetchMethods();
    } catch {
      Alert.alert('Error', 'Failed to update default payment method.');
    } finally {
      setDefaultingId(null);
    }
  }, [fetchMethods]);

  const handleDelete = useCallback((method: PaymentMethodInfo) => {
    Alert.alert(
      'Remove Card',
      `Remove ${method.label} ending in ${method.last4}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(method.id);
            try {
              await paymentMethodApi.remove(method.id);
              fetchMethods();
            } catch {
              Alert.alert('Error', 'Failed to remove payment method.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }, [fetchMethods]);

  if (!ready || !user) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="BILLING" />

      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Current Plan */}
          <HCard>
            <View style={styles.planRow}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>CURRENT PLAN</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>
                {user.is_pro ? 'Explorer Pro' : 'Free'}
              </Text>
              {user.is_pro && (
                <Text style={styles.proBadge}>ACTIVE</Text>
              )}
            </View>
          </HCard>

          {/* Payment Methods */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Rect x={1} y={4} width={22} height={16} rx={0} />
                <Path d="M1 10h22" />
              </Svg>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PAYMENT METHODS</Text>
            </View>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />

            {loading ? (
              <ActivityIndicator color={brandColors.copper} style={styles.loader} />
            ) : methods.length === 0 && !showAddCard ? (
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                No payment methods saved. Add a card to sponsor explorers.
              </Text>
            ) : (
              methods.map(method => (
                <HCard key={method.id}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardInfo}>
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textSecondary} strokeWidth={2}>
                        <Rect x={1} y={4} width={22} height={16} rx={0} />
                        <Path d="M1 10h22" />
                      </Svg>
                      <View style={styles.cardText}>
                        <View style={styles.cardNameRow}>
                          <Text style={[styles.cardName, { color: colors.text }]}>
                            {method.label} **** {method.last4}
                          </Text>
                          {method.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      {!method.isDefault && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: colors.border }]}
                          onPress={() => handleSetDefault(method.id)}
                          disabled={defaultingId === method.id}
                        >
                          {defaultingId === method.id ? (
                            <ActivityIndicator color={colors.text} size="small" />
                          ) : (
                            <Text style={[styles.actionBtnText, { color: colors.text }]}>DEFAULT</Text>
                          )}
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.border }]}
                        onPress={() => handleDelete(method)}
                        disabled={deletingId === method.id}
                      >
                        {deletingId === method.id ? (
                          <ActivityIndicator color={brandColors.red} size="small" />
                        ) : (
                          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={brandColors.red} strokeWidth={2}>
                            <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </Svg>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </HCard>
              ))
            )}

            {/* Add card form */}
            {showAddCard ? (
              <HCard>
                <View style={styles.addCardForm}>
                  <Text style={[styles.addCardTitle, { color: colors.text }]}>Add New Card</Text>

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

                  <View style={styles.securityRow}>
                    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                      <Rect x={3} y={11} width={18} height={11} rx={0} />
                      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </Svg>
                    <Text style={[styles.securityText, { color: colors.textTertiary }]}>
                      Secure payment via Stripe. Card numbers never touch our servers.
                    </Text>
                  </View>

                  <View style={styles.addCardButtons}>
                    <TouchableOpacity
                      style={[styles.cancelBtn, { borderColor: colors.border }]}
                      onPress={() => { setShowAddCard(false); setCardComplete(false); }}
                      disabled={addingCard}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.text }]}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, { opacity: !cardComplete || addingCard ? 0.5 : 1 }]}
                      onPress={handleAddCard}
                      disabled={!cardComplete || addingCard}
                    >
                      {addingCard ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <Text style={styles.saveBtnText}>SAVE CARD</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </HCard>
            ) : (
              <HButton
                variant="blue"
                onPress={() => setShowAddCard(true)}
              >
                ADD PAYMENT METHOD
              </HButton>
            )}
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  loader: { paddingVertical: 24 },
  planRow: { padding: 14 },
  sectionLabel: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  planValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  proBadge: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.green,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  sectionLine: {
    height: 2,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: mono,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
  },
  // Card row
  cardRow: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardText: {
    flex: 1,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardName: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
  },
  defaultBadge: {
    backgroundColor: brandColors.blue,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontFamily: mono,
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    borderWidth: borders.thick,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 32,
  },
  actionBtnText: {
    fontFamily: mono,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  // Add card form
  addCardForm: {
    padding: 16,
  },
  addCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: 12,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 16,
  },
  securityText: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
  },
  addCardButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: borders.thick,
  },
  cancelBtnText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: brandColors.blue,
  },
  saveBtnText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.4,
  },
  spacer: { height: 32 },
});
