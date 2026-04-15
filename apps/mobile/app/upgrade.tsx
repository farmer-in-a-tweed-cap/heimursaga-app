import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HButton } from '@/components/ui/HButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { api, ApiError } from '@/services/api';
import { mono, heading, colors as brandColors, borders } from '@/theme/tokens';
import { Svg, Path } from 'react-native-svg';
// Lazy-load react-native-iap — native module may not be available until EAS rebuild
let iap: typeof import('react-native-iap') | null = null;
try {
  iap = require('react-native-iap');
} catch {
  if (__DEV__) console.warn('[IAP] react-native-iap native module not available');
}

type ProductSubscription = import('react-native-iap').ProductSubscription;
type Purchase = import('react-native-iap').Purchase;
type PurchaseError = import('react-native-iap').PurchaseError;

// ─── Product IDs (must match App Store Connect / Google Play Console) ───

const PRODUCT_IDS = Platform.select({
  ios: ['com.heimursaga.pro.monthly', 'com.heimursaga.pro.annual'],
  android: ['com.heimursaga.pro.monthly', 'com.heimursaga.pro.annual'],
  default: [],
});

const MONTHLY_ID = 'com.heimursaga.pro.monthly';
const ANNUAL_ID = 'com.heimursaga.pro.annual';

// ─── Feature List ───

const FEATURES = [
  'Receive one-time and monthly sponsorships',
  'Direct messaging with other Pro explorers',
  'Expedition Notes (500-char updates for sponsors)',
  'Emailed journal entries to sponsors',
  'Up to 10 photos per entry (vs 2 for free)',
  'Entry view counts and engagement insights',
  'Custom sponsorship tiers',
  'Stripe Connect payouts to your bank',
];

const CORE_FEATURES = [
  { title: 'Receive Sponsorships', desc: 'Accept contributions and monthly subscriptions from supporters who fund your expeditions.' },
  { title: 'Direct Messages', desc: 'Private messaging with other Explorer Pro users for deeper connections on the trail.' },
  { title: 'Expedition Notes', desc: 'Post short 500-character updates visible only to your sponsors to keep them engaged.' },
  { title: 'More Photos Per Entry', desc: 'Upload up to 10 photos per journal entry instead of 2 for free accounts.' },
  { title: 'Expedition Insights', desc: 'Track entry views, engagement metrics, and sponsor activity.' },
  { title: 'Emailed Entries', desc: 'Journal entries are automatically emailed to your sponsors so they never miss an update.' },
];

export default function UpgradeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();
  const { user, refreshUser } = useAuth();
  const isPro = !!user?.is_pro;

  // IAP state
  const [connected, setConnected] = useState(false);
  const [products, setProducts] = useState<ProductSubscription[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Billing period: 0=monthly, 1=annual
  const [billingPeriod, setBillingPeriod] = useState(0);

  // Stable refs for purchase handler callbacks (avoids listener re-registration)
  const routerRef = useRef(router);
  routerRef.current = router;
  const refreshUserRef = useRef(refreshUser);
  refreshUserRef.current = refreshUser;

  // ─── Initialize IAP connection (skip for Pro users) ───

  useEffect(() => {
    if (isPro) {
      setLoadingProducts(false);
      return;
    }

    let mounted = true;

    async function init() {
      if (!iap) {
        if (mounted) setLoadingProducts(false);
        return;
      }
      try {
        await iap.initConnection();
        if (!mounted) return;
        setConnected(true);

        const subs = await iap.fetchProducts({ skus: PRODUCT_IDS, type: 'subs' });
        if (__DEV__) console.log('[IAP] fetchProducts result:', JSON.stringify(subs), 'requested:', PRODUCT_IDS);
        if (!mounted) return;
        setProducts((subs ?? []) as ProductSubscription[]);
      } catch (err) {
        if (__DEV__) console.warn('[IAP] init error:', err);
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    }

    init();

    return () => {
      mounted = false;
      iap?.endConnection();
    };
  }, [isPro]);

  // ─── Purchase listeners (registered when connected) ───

  useEffect(() => {
    if (!connected || !iap) return;

    const purchaseSub = iap.purchaseUpdatedListener(
      async (purchase: Purchase) => {
        let receiptData: string | null | undefined;
        try {
          receiptData = Platform.OS === 'ios'
            ? await iap!.getReceiptIOS()
            : purchase.purchaseToken;
        } catch (err) {
          if (__DEV__) console.warn('[IAP] getReceiptIOS error:', err);
        }

        if (!receiptData) {
          Alert.alert('Error', 'No receipt data received.');
          setPurchasing(false);
          return;
        }

        try {
          await api.post('/plan/upgrade/apple', {
            receiptData,
            productId: purchase.productId,
            platform: Platform.OS,
            transactionId: purchase.id,
          });

          await refreshUserRef.current();

          Alert.alert(
            'Welcome to Explorer Pro!',
            'Your upgrade is complete. You now have access to all Pro features.',
            [{ text: 'OK', onPress: () => routerRef.current.back() }],
          );
        } catch (err) {
          const msg = err instanceof ApiError
            ? err.message
            : 'Failed to verify purchase. Please contact support.';
          Alert.alert('Verification Error', msg);
          if (__DEV__) console.error('[IAP] verification error:', err);
        } finally {
          // Always finish the transaction to prevent re-delivery loops
          try {
            await iap!.finishTransaction({ purchase, isConsumable: false });
          } catch (finishErr) {
            if (__DEV__) console.warn('[IAP] finishTransaction error:', finishErr);
          }
          setPurchasing(false);
        }
      },
    );

    const errorSub = iap.purchaseErrorListener((error: PurchaseError) => {
      setPurchasing(false);
      if (error.code === 'user-cancelled') return;
      Alert.alert('Purchase Error', error.message || 'Something went wrong.');
    });

    return () => {
      purchaseSub?.remove();
      errorSub?.remove();
    };
  }, [connected]);

  // ─── Handle purchase ───

  const handleSubscribe = useCallback(async () => {
    const productId = billingPeriod === 0 ? MONTHLY_ID : ANNUAL_ID;

    if (!connected || !iap) {
      Alert.alert('Store Unavailable', 'Could not connect to the app store. Please try again.');
      return;
    }

    if (products.length === 0) {
      Alert.alert(
        'Subscriptions Unavailable',
        'This product isn\'t available yet. Make sure your Apple ID is signed in and the subscription is approved in App Store Connect.',
      );
      return;
    }

    setPurchasing(true);

    try {
      await iap.requestPurchase({
        request: Platform.OS === 'ios'
          ? { apple: { sku: productId } }
          : { google: { skus: [productId] } },
        type: 'subs',
      });
    } catch (err) {
      setPurchasing(false);
      if (__DEV__) console.warn('[IAP] purchase error:', err);
      const msg = err instanceof Error ? err.message : 'Purchase failed. Please try again.';
      Alert.alert('Purchase Error', msg);
    }
  }, [billingPeriod, connected, products.length]);

  // ─── Derive pricing from store products ───

  const monthlyProduct = products.find(p => p.id === MONTHLY_ID);
  const annualProduct = products.find(p => p.id === ANNUAL_ID);

  const monthlyPrice = monthlyProduct?.displayPrice ?? '$6.99';
  const annualPrice = annualProduct?.displayPrice ?? '$49.99';
  const activePrice = billingPeriod === 0 ? monthlyPrice : annualPrice;
  const activePeriod = billingPeriod === 0 ? '/month' : '/year';

  // Compute savings dynamically from store prices when available
  const savingsLabel = (() => {
    const mPrice = monthlyProduct?.price ?? 6.99;
    const aPrice = annualProduct?.price ?? 49.99;
    const fullYear = mPrice * 12;
    const saved = fullYear - aPrice;
    if (saved <= 0) return null;
    const pct = Math.round((saved / fullYear) * 100);
    return `SAVE ${pct}% — ${monthlyProduct?.currency === 'USD' || !monthlyProduct ? '$' : ''}${saved.toFixed(0)} off compared to monthly`;
  })();

  // ─── Already Pro ───

  if (isPro && ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="EXPLORER PRO" />
        <View style={styles.alreadyPro}>
          <View style={[styles.proCard, { backgroundColor: colors.card, borderColor: brandColors.copper }]}>
            <View style={styles.proCheckRow}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2.5}>
                <Path d="M20 6L9 17l-5-5" />
              </Svg>
              <Text style={[styles.proTitle, { color: colors.text }]}>Already Explorer Pro</Text>
            </View>
            <Text style={[styles.proDesc, { color: colors.textSecondary }]}>
              You're already enjoying Explorer Pro benefits! Manage your subscription in billing settings.
            </Text>
            <HButton variant="blue" onPress={() => router.push('/settings/billing')}>
              GO TO BILLING
            </HButton>
          </View>
        </View>
      </View>
    );
  }

  // ─── Loading ───

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="EXPLORER PRO" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="EXPLORER PRO" />

      <ScrollView>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Explorer Pro</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              Transform your exploration into sustainable income. Receive sponsorships, access advanced tools, and build a community of supporters.
            </Text>
          </View>

          {/* Pricing Card */}
          <HCard>
            <View style={styles.pricingCard}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT PLAN</Text>
              <View style={[styles.labelLine, { backgroundColor: colors.border }]} />

              <SegmentedControl
                options={['MONTHLY', 'YEARLY']}
                active={billingPeriod}
                onSelect={setBillingPeriod}
              />

              {/* Price display */}
              <View style={styles.priceRow}>
                <Text style={[styles.priceAmount, { color: brandColors.copper }]}>
                  {activePrice}
                </Text>
                <Text style={[styles.pricePeriod, { color: colors.textTertiary }]}>
                  {activePeriod}
                </Text>
              </View>

              {billingPeriod === 1 && savingsLabel && (
                <View style={[styles.savingsBadge, { backgroundColor: `${brandColors.blue}18` }]}>
                  <Text style={[styles.savingsText, { color: brandColors.blue }]}>
                    {savingsLabel}
                  </Text>
                </View>
              )}

              <Text style={[styles.cancelNote, { color: colors.textTertiary }]}>
                Cancel anytime. No commitment.
              </Text>
            </View>
          </HCard>

          {/* Subscribe button */}
          <View style={styles.subscribeWrap}>
            <HButton
              variant="copper"
              onPress={handleSubscribe}
              disabled={purchasing || loadingProducts}
            >
              {purchasing
                ? 'PROCESSING...'
                : loadingProducts
                  ? 'LOADING...'
                  : `SUBSCRIBE ${activePrice}${activePeriod.toUpperCase()}`}
            </HButton>
          </View>

          {/* Core Features */}
          <SectionDivider title="CORE FEATURES" />
          <View style={styles.featuresGrid}>
            {CORE_FEATURES.map((feature) => (
              <View
                key={feature.title}
                style={[styles.featureCard, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{feature.desc}</Text>
              </View>
            ))}
          </View>

          {/* Complete Feature List */}
          <SectionDivider title="ALL FEATURES INCLUDED" />
          <HCard>
            <View style={styles.featureList}>
              {FEATURES.map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={brandColors.blue} strokeWidth={2.5}>
                    <Path d="M20 6L9 17l-5-5" />
                  </Svg>
                  <Text style={[styles.featureItemText, { color: colors.text }]}>{feature}</Text>
                </View>
              ))}
            </View>
          </HCard>

          {/* Terms */}
          <View style={styles.terms}>
            <Text style={[styles.termsText, { color: colors.textTertiary }]}>
              Payment will be charged to your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account at confirmation of purchase. Subscription automatically renews unless cancelled at least 24 hours before the end of the current period. Manage subscriptions in your {Platform.OS === 'ios' ? 'Apple ID' : 'Google Play'} account settings.
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
  header: { marginBottom: 20 },
  headerTitle: {
    fontFamily: heading,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSub: {
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 20,
  },
  pricingCard: { padding: 16 },
  sectionLabel: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  labelLine: { height: 2, marginBottom: 12 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 20,
    gap: 4,
  },
  priceAmount: {
    fontFamily: mono,
    fontSize: 36,
    fontWeight: '700',
  },
  pricePeriod: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '600',
  },
  savingsBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  savingsText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelNote: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  subscribeWrap: { marginVertical: 16 },
  featuresGrid: { gap: 10 },
  featureCard: {
    borderWidth: borders.thick,
    padding: 14,
  },
  featureTitle: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontFamily: mono,
    fontSize: 12,
    lineHeight: 18,
  },
  featureList: { padding: 14, gap: 12 },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureItemText: {
    flex: 1,
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 19,
  },
  terms: { marginTop: 20, paddingHorizontal: 4 },
  termsText: {
    fontFamily: mono,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  alreadyPro: { padding: 16, paddingVertical: 24 },
  proCard: { borderWidth: borders.thick, padding: 20, gap: 14 },
  proCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  proTitle: { fontFamily: mono, fontSize: 16, fontWeight: '700', letterSpacing: 0.4 },
  proDesc: { fontFamily: mono, fontSize: 12, lineHeight: 18 },
  spacer: { height: 32 },
});
