import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { api, ApiError } from '@/services/api';
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
        if (!token) return;

        // If biometric enabled, don't auto-login — let login screen handle it
        if (bioPref && bioAvail) {
          setHasStoredSession(true);
          return;
        }

        // No biometric — auto-login with stored token
        const res = await api.get<{ success: boolean; data: User }>(
          '/auth/mobile/user',
        );
        setUser(res.data);
      } catch {
        await clearTokens();
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
  }, []);

  const register = useCallback(
    async (email: string, username: string, password: string) => {
      await api.post('/auth/register', { email, username, password }, { noAuth: true });
      await login(username, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setHasStoredSession(false);
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
