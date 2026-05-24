import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/services/api';

// Lazy-load react-native-iap — native module may not be available until EAS rebuild
let iap: typeof import('react-native-iap') | null = null;
try {
  iap = require('react-native-iap');
} catch {
  if (__DEV__) console.warn('[IAP] react-native-iap native module not available');
}

// ─── Product IDs (must match App Store Connect / Google Play Console) ───

export const PRODUCT_IDS = Platform.select({
  ios: ['com.heimursaga.pro.monthly', 'com.heimursaga.pro.annual'],
  android: ['com.heimursaga.pro.monthly', 'com.heimursaga.pro.annual'],
  default: [] as string[],
});

export const MONTHLY_ID = 'com.heimursaga.pro.monthly';
export const ANNUAL_ID = 'com.heimursaga.pro.annual';

/**
 * Apple Guideline 3.1.1 — Restore Purchases.
 *
 * Required to be exposed on a button users can find regardless of how the app
 * thinks their subscription state looks (Apple's reviewer test: install, sign
 * in on a fresh device, expect to be Pro but the backend says Free → must be
 * able to restore). Used from /upgrade (free + already-pro views) and from
 * Settings → Billing (the canonical location reviewers check first).
 */
export function useRestorePurchases() {
  const { refreshUser } = useAuth();
  const [restoring, setRestoring] = useState(false);

  const restore = useCallback(async () => {
    if (!iap) {
      Alert.alert('Store Unavailable', 'Could not connect to the app store. Please try again.');
      return;
    }
    setRestoring(true);
    try {
      const purchases = await iap.getAvailablePurchases();
      const sub = purchases.find(
        (p) => p.productId === MONTHLY_ID || p.productId === ANNUAL_ID,
      );
      if (!sub) {
        Alert.alert(
          'Nothing to Restore',
          'No previous Explorer Pro purchases were found on this Apple ID.',
        );
        return;
      }
      let receiptData: string | null | undefined;
      try {
        receiptData = Platform.OS === 'ios'
          ? await iap.getReceiptIOS()
          : sub.purchaseToken;
      } catch (err) {
        if (__DEV__) console.warn('[IAP] getReceiptIOS error (restore):', err);
      }
      if (!receiptData) {
        Alert.alert('Restore Failed', 'Could not retrieve your purchase receipt.');
        return;
      }
      await api.post('/plan/upgrade/apple', {
        receiptData,
        productId: sub.productId,
        platform: Platform.OS,
        transactionId: sub.id,
      });
      await refreshUser();
      Alert.alert(
        'Purchases Restored',
        'Your Explorer Pro subscription has been restored.',
      );
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : 'Failed to restore purchases. Please try again or contact support.';
      Alert.alert('Restore Error', msg);
      if (__DEV__) console.error('[IAP] restore error:', err);
    } finally {
      setRestoring(false);
    }
  }, [refreshUser]);

  return { restore, restoring };
}
