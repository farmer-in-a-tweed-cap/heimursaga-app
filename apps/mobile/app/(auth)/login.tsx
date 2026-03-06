import { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { colors as brandColors, mono, borders } from '@/theme/tokens';
import { TopoBackground } from '@/components/ui/TopoBackground';
import { HButton } from '@/components/ui/HButton';
import { HTextField } from '@/components/ui/HTextField';
import { HCard } from '@/components/ui/HCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

export default function LoginScreen() {
  const { dark, colors } = useTheme();
  const { login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<0 | 1>(0); // 0=login, 1=register
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Login fields
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  async function handleLogin() {
    if (!usernameOrEmail || !password) return;
    setSubmitting(true);
    try {
      await login(usernameOrEmail, password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    if (!regEmail || !regUsername || !regPassword) return;
    if (regPassword !== regConfirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await register(regEmail, regUsername, regPassword);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Could not create account');
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
              />
              <HTextField
                label="PASSWORD"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {/* Remember me */}
              <Pressable
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[
                  styles.rememberBox,
                  {
                    borderColor: rememberMe ? brandColors.copper : colors.borderThin,
                    backgroundColor: rememberMe ? brandColors.copper : colors.inputBackground,
                  }
                ]}>
                  {rememberMe && (
                    <Svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                      <Path d="M20 6L9 17l-5-5" />
                    </Svg>
                  )}
                </View>
                <Text style={[styles.rememberText, { color: colors.textSecondary }]}>Remember me</Text>
              </Pressable>

              <HButton onPress={handleLogin} disabled={submitting}>
                {submitting ? 'SIGNING IN...' : 'LOGIN TO ACCOUNT'}
              </HButton>

              {/* Forgot password */}
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
              />
              <HTextField
                label="USERNAME"
                placeholder="Choose a username"
                value={regUsername}
                onChangeText={setRegUsername}
                autoCapitalize="none"
              />
              <HTextField
                label="PASSWORD"
                placeholder="Create a password"
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry
              />
              <HTextField
                label="CONFIRM PASSWORD"
                placeholder="Repeat your password"
                value={regConfirm}
                onChangeText={setRegConfirm}
                secureTextEntry
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
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  rememberBox: { width: 14, height: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rememberText: { fontSize: 15 },
});
