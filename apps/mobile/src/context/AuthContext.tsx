import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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
  login: (usernameOrEmail: string, password: string) => Promise<void>;
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
  const [locked, setLocked] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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
        if (!token) {
          setLoading(false);
          return;
        }

        // If biometric is enabled, prompt before revealing user
        if (bioPref && bioAvail) {
          const authed = await authenticateWithBiometric();
          if (!authed) {
            setLoading(false);
            return;
          }
        }

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

  // AppState listener: re-prompt biometric on resume from background
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === 'active' &&
          biometricEnabled &&
          biometricAvailable &&
          user
        ) {
          setLocked(true);
          const authed = await authenticateWithBiometric();
          if (!authed) {
            // Keep locked — user can retry by backgrounding/foregrounding
            return;
          }
          setLocked(false);
        }
        appStateRef.current = nextState;
      },
    );
    return () => subscription.remove();
  }, [biometricEnabled, biometricAvailable, user]);

  const login = useCallback(
    async (usernameOrEmail: string, password: string) => {
      const res = await api.post<{
        success: boolean;
        data: { token: string; refreshToken: string; user: User };
      }>('/auth/mobile/login', { login: usernameOrEmail, password }, { noAuth: true });

      await setTokens(res.data.token, res.data.refreshToken);
      setUser(res.data.user);
      setLocked(false);
    },
    [],
  );

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
    setLocked(false);
  }, []);

  const handleSetBiometricEnabled = useCallback(async (enabled: boolean) => {
    if (enabled) {
      const authed = await authenticateWithBiometric();
      if (!authed) return;
    }
    await setBiometricPreference(enabled);
    setBiometricEnabledState(enabled);
  }, []);

  const isAuthenticated = !!user && !locked;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        biometricEnabled,
        biometricAvailable,
        isAuthenticated,
        login,
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
