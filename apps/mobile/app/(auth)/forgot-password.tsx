import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { authApi } from '@/services/api';
import { colors as brandColors, mono } from '@/theme/tokens';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { HButton } from '@/components/ui/HButton';
import { HTextField } from '@/components/ui/HTextField';
import { HCard } from '@/components/ui/HCard';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(email.trim());
      setSent(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset email');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            RESET PASSWORD
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {sent ? (
            <HCard style={styles.successCard}>
              <View style={styles.successInner}>
                <Text style={[styles.successTitle, { color: colors.text }]}>
                  Check your email
                </Text>
                <Text style={[styles.successBody, { color: colors.textSecondary }]}>
                  If an account with that email exists, we've sent password reset instructions.
                </Text>
                <HButton onPress={() => router.back()} style={styles.backBtn}>
                  BACK TO LOGIN
                </HButton>
              </View>
            </HCard>
          ) : (
            <>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Enter the email address associated with your account and we'll send you a link to reset your password.
              </Text>

              <HTextField
                label="EMAIL"
                placeholder="Enter your email address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />

              <HButton onPress={handleReset} disabled={submitting}>
                {submitting ? 'SENDING...' : 'SEND RESET LINK'}
              </HButton>

              <HButton variant="copper" outline onPress={() => router.back()} style={styles.backBtn}>
                BACK TO LOGIN
              </HButton>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingTop: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.7,
    fontFamily: mono,
    marginBottom: 6,
  },
  divider: { height: 2, marginBottom: 16 },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  successCard: { marginTop: 8 },
  successInner: { padding: 16 },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  successBody: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  backBtn: { marginTop: 8 },
});
