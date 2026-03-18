import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { api, ApiError } from '@/services/api';
import { analytics } from '@/services/analytics';
import {
  setTokens,
  clearTokens,
  getAccessToken,
} from '@/services/tokenStorage';
import {
  isBiometricAvailable,
  authenticateWithBiometric,
  getBiometricPreference,
  setBiometricPreference,
} from '@/services/biometricStorage';

interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  picture?: string;
  is_pro?: boolean;
  isPremium?: boolean;
  stripeAccountConnected?: boolean;
  created_at?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  isAuthenticated: boolean;
  /** True when a stored token exists but biometric login hasn't been completed yet */
  hasStoredSession: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  /** Re-fetch the current user from API (e.g. after upgrading to Pro) */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasStoredSession, setHasStoredSession] = useState(false);

  // On mount, check for stored tokens and validate
  useEffect(() => {
    (async () => {
      try {
        const [bioAvail, bioPref] = await Promise.all([
          isBiometricAvailable(),
          getBiometricPreference(),
        ]);
        setBiometricAvailable(bioAvail);
        setBiometricEnabledState(bioPref);

        const token = await getAccessToken();
        if (__DEV__) console.log('[Auth] stored token:', token ? `${token.slice(0, 20)}...` : 'none');
        if (__DEV__) console.log('[Auth] biometric:', { bioAvail, bioPref });
        if (!token) return;

        // If biometric enabled, don't auto-login — let login screen handle it
        // Skip in dev to avoid re-authenticating on every reload
        if (bioPref && bioAvail && !__DEV__) {
          setHasStoredSession(true);
          return;
        }

        // No biometric — auto-login with stored token
        if (__DEV__) console.log('[Auth] calling /auth/mobile/user at', require('@/services/api').API_BASE_URL);
        const res = await api.get<{ success: boolean; data: User }>(
          '/auth/mobile/user',
        );
        if (__DEV__) console.log('[Auth] auto-login success:', res.data?.username);
        setUser(res.data);
        analytics.identify(String(res.data.id), {
          username: res.data.username,
          email: res.data.email,
          is_pro: res.data.is_pro,
        });
      } catch (err) {
        if (__DEV__) console.log('[Auth] auto-login failed:', err instanceof ApiError ? `${err.status}: ${err.message}` : err);
        // Only clear tokens on auth failures (401/403), not network errors
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          await clearTokens();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (usernameOrEmail: string, password: string) => {
      const res = await api.post<{
        success: boolean;
        data: { token: string; refreshToken: string; user: User };
      }>('/auth/mobile/login', { login: usernameOrEmail, password }, { noAuth: true });

      await setTokens(res.data.token, res.data.refreshToken);
      setUser(res.data.user);
      setHasStoredSession(false);
      analytics.identify(String(res.data.user.id), {
        username: res.data.user.username,
        email: res.data.user.email,
        is_pro: res.data.user.is_pro,
      });
      analytics.track('login', { method: 'password' });
    },
    [],
  );

  const loginWithBiometric = useCallback(async () => {
    const authed = await authenticateWithBiometric();
    if (!authed) throw new Error('Biometric authentication failed');

    const res = await api.get<{ success: boolean; data: User }>(
      '/auth/mobile/user',
    );
    setUser(res.data);
    setHasStoredSession(false);
    analytics.identify(String(res.data.id), { username: res.data.username });
    analytics.track('login', { method: 'biometric' });
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      await api.post('/auth/register', { email, username, password }, { noAuth: true });
      await login(username, password);
      analytics.track('signup', { method: 'email' });
    },
    [login],
  );

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setHasStoredSession(false);
    analytics.reset();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: User }>(
        '/auth/mobile/user',
      );
      setUser(res.data);
    } catch {
      // Silently fail — user stays as-is
    }
  }, []);

  const handleSetBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const authed = await authenticateWithBiometric();
      if (!authed) return;
    }
    await setBiometricPreference(enabled);
    setBiometricEnabledState(enabled);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        biometricEnabled,
        biometricAvailable,
        isAuthenticated: !!user,
        hasStoredSession,
        login,
        loginWithBiometric,
        register,
        logout,
        setBiometricEnabled: handleSetBiometricEnabled,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
