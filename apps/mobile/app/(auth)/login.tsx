import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
  TextInput,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import { colors as brandColors, mono, borders } from '@/theme/tokens';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { HButton } from '@/components/ui/HButton';
import { HTextField } from '@/components/ui/HTextField';
import { HCard } from '@/components/ui/HCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

// Prevent autofill auto-submit from looping across remounts
let lastAutoLoginAt = 0;

export default function LoginScreen() {
  const { dark, colors } = useTheme();
  const { login, register, loginWithBiometric, hasStoredSession, biometricAvailable, biometricEnabled } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<0 | 1>(0); // 0=login, 1=register
  const [submitting, setSubmitting] = useState(false);

  // Refs for field chaining
  const passwordRef = useRef<TextInput>(null);
  const regUsernameRef = useRef<TextInput>(null);
  const regPasswordRef = useRef<TextInput>(null);
  const regConfirmRef = useRef<TextInput>(null);

  // Autofill detection: when both login fields change in the same render, auto-submit.
  // Module-level cooldown prevents looping if login succeeds but auth bounces back.
  const prevLogin = useRef({ user: '', pass: '' });

  // Login fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regInviteCode, setRegInviteCode] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const regInviteRef = useRef<TextInput>(null);

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();
    if (!usernameOrEmail || !password) return;
    setSubmitting(true);
    try {
      await login(usernameOrEmail, password);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Login Failed', msg);
    } finally {
      setSubmitting(false);
    }
  }, [usernameOrEmail, password, login]);

  useEffect(() => {
    if (mode !== 0 || submitting) return;
    if (Date.now() - lastAutoLoginAt < 10000) return;
    const prev = prevLogin.current;
    const bothChanged = usernameOrEmail !== prev.user && password !== prev.pass;
    const bothFilled = !!usernameOrEmail && !!password;
    prevLogin.current = { user: usernameOrEmail, pass: password };
    if (bothChanged && bothFilled) {
      lastAutoLoginAt = Date.now();
      Keyboard.dismiss();
      handleLogin();
    }
  }, [usernameOrEmail, password, handleLogin]);

  async function handleRegister() {
    Keyboard.dismiss();
    if (!regEmail || !regUsername || !regPassword) return;
    if (regPassword !== regConfirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await register(regEmail, regUsername, regPassword, regInviteCode.trim() || undefined);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Registration Failed', msg);
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
          {/* Logo Masthead */}
          <View style={styles.masthead}>
            <Image
              source={dark ? require('../../assets/logo-lg-light.png') : require('../../assets/logo-lg-dark.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Tagline */}
          <View style={styles.taglineRow}>
            <View style={[styles.taglineLine, { backgroundColor: colors.borderThin }]} />
            <Text style={[styles.taglineText, { color: colors.textTertiary }]}>
              EXPLORE {'\u00B7'} SHARE {'\u00B7'} SPONSOR
            </Text>
            <View style={[styles.taglineLine, { backgroundColor: colors.borderThin }]} />
          </View>

          {/* Mode toggle */}
          <View style={styles.toggleWrap}>
            <SegmentedControl
              options={['LOGIN', 'REGISTER']}
              active={mode}
              onSelect={(i) => setMode(i as 0 | 1)}
            />
          </View>

          {mode === 0 ? (
            <>
              {/* Section header */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                ACCOUNT LOGIN
              </Text>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />

              <HTextField
                label="EMAIL OR USERNAME"
                placeholder="Enter your email or username"
                value={usernameOrEmail}
                onChangeText={setUsernameOrEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                blurOnSubmit={false}
              />
              <HTextField
                ref={passwordRef}
                label="PASSWORD"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />

              <HButton onPress={handleLogin} disabled={submitting}>
                {submitting ? 'SIGNING IN...' : 'LOGIN TO ACCOUNT'}
              </HButton>

              {hasStoredSession && biometricAvailable && biometricEnabled && (
                <HButton
                  outline
                  onPress={async () => {
                    setSubmitting(true);
                    try {
                      await loginWithBiometric();
                    } catch (err: any) {
                      const msg = err?.status === 401
                        ? 'Your session has expired. Please log in with your password.'
                        : 'Biometric login was cancelled or failed.';
                      Alert.alert('Authentication Failed', msg);
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={submitting}
                  style={{ marginTop: 12 }}
                >
                  LOGIN WITH BIOMETRICS
                </HButton>
              )}

              {/* Forgot password */}
              <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                <HCard style={styles.forgotCard}>
                  <View style={styles.forgotInner}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                      <Circle cx={12} cy={12} r={10} />
                      <Path d="M12 16v-4M12 8h.01" />
                    </Svg>
                    <View>
                      <Text style={[styles.forgotLabel, { color: colors.textSecondary }]}>
                        Forgot your password?
                      </Text>
                      <Text style={styles.forgotLink}>Reset via email →</Text>
                    </View>
                  </View>
                </HCard>
              </Pressable>

            </>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                CREATE NEW ACCOUNT
              </Text>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />

              <HTextField
                label="EMAIL"
                placeholder="Your email address"
                value={regEmail}
                onChangeText={setRegEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => regUsernameRef.current?.focus()}
                blurOnSubmit={false}
              />
              <HTextField
                ref={regUsernameRef}
                label="USERNAME"
                placeholder="Choose a username"
                value={regUsername}
                onChangeText={setRegUsername}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => regInviteRef.current?.focus()}
                blurOnSubmit={false}
              />
              <HTextField
                ref={regInviteRef}
                label="INVITE CODE (OPTIONAL)"
                placeholder="Enter invite code if you have one"
                value={regInviteCode}
                onChangeText={setRegInviteCode}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => regPasswordRef.current?.focus()}
                blurOnSubmit={false}
              />
              <HTextField
                ref={regPasswordRef}
                label="PASSWORD"
                placeholder="Create a password"
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry
                returnKeyType="next"
                onSubmitEditing={() => regConfirmRef.current?.focus()}
                blurOnSubmit={false}
              />
              <HTextField
                ref={regConfirmRef}
                label="CONFIRM PASSWORD"
                placeholder="Repeat your password"
                value={regConfirm}
                onChangeText={setRegConfirm}
                secureTextEntry
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />

              <HButton onPress={handleRegister} disabled={submitting}>
                {submitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
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
  scroll: { padding: 20 },
  masthead: { alignItems: 'center', paddingTop: 20 },
  logo: { height: 64, width: 180 },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 20,
  },
  taglineLine: { flex: 1, height: 1 },
  taglineText: {
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
    fontFamily: mono,
  },
  toggleWrap: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.7,
    fontFamily: mono,
    marginBottom: 6,
  },
  divider: { height: 2, marginBottom: 16 },
  forgotCard: { marginTop: 16, padding: 12 },
  forgotInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  forgotLabel: { fontSize: 14 },
  forgotLink: {
    fontSize: 14,
    color: brandColors.copper,
    fontWeight: '700',
  },
});
