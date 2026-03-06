import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_PREF_KEY = 'heimursaga_biometric_enabled';

// Lazy-load expo-local-authentication to gracefully handle missing native module (Expo Go)
let LocalAuthentication: typeof import('expo-local-authentication') | null = null;
try {
  LocalAuthentication = require('expo-local-authentication');
} catch {
  // Native module not available (e.g. running in Expo Go)
}

export async function isBiometricAvailable(): Promise<boolean> {
  if (!LocalAuthentication) return false;
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometric(): Promise<boolean> {
  if (!LocalAuthentication) return false; // Fail secure if module unavailable
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to continue',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false; // Fail secure on native module errors
  }
}

export async function getBiometricPreference(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY);
  return val === 'true';
}

export async function setBiometricPreference(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, enabled ? 'true' : 'false');
}
