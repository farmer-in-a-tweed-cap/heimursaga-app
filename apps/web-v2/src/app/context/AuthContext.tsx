'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { authApi, SessionUser, ApiError, clearCsrfToken, onSessionExpired } from '@/app/services/api';
import { posthog } from '@/lib/posthog';

// Re-export SessionUser as User for backwards compatibility
export type User = SessionUser;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewSignup: boolean;
  sessionExpired: boolean;
  login: (login: string, password: string, remember?: boolean) => Promise<void>;
  signup: (email: string, username: string, password: string, recaptchaToken?: string, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearNewSignup: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewSignup, setIsNewSignup] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const isAuthenticated = user !== null;

  const clearNewSignup = useCallback(() => {
    setIsNewSignup(false);
  }, []);

  // Fetch current user from API
  const refreshUser = useCallback(async () => {
    try {
      const userData = await authApi.getUser();
      setUser(userData);
    } catch {
      // User is not authenticated or session expired
      setUser(null);
    }
  }, []);

  // Clear auth state immediately when any API call gets a 401
  useEffect(() => {
    onSessionExpired(() => {
      setUser(prev => {
        if (prev !== null) setSessionExpired(true);
        return null;
      });
    });
    return () => onSessionExpired(null);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const userData = await authApi.getUser();
        if (!cancelled) {
          setUser(userData);
          if (posthog.__loaded) {
            posthog.identify(String(userData.id), {
              username: userData.username,
              email: userData.email,
              role: userData.role,
              is_premium: userData.isPremium,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (loginInput: string, password: string, remember?: boolean) => {
    await authApi.login({ login: loginInput, password, remember });
    await refreshUser();
    setSessionExpired(false);
    if (posthog.__loaded) posthog.capture('login', { method: 'password' });
  };

  const signup = async (email: string, username: string, password: string, recaptchaToken?: string, inviteCode?: string) => {
    await authApi.signup({ email, username, password, recaptchaToken, inviteCode });
    await refreshUser();
    setSessionExpired(false);
    if (posthog.__loaded) posthog.capture('signup', { method: 'email' });
    setIsNewSignup(true);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setSessionExpired(false);
      clearCsrfToken();
      if (posthog.__loaded) posthog.reset();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      isNewSignup,
      sessionExpired,
      login,
      signup,
      logout,
      refreshUser,
      clearNewSignup,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook for checking pro features
// Explorer Pro is determined by role === 'creator' (set by Stripe subscription webhooks)
export function useProFeatures() {
  const { user } = useAuth();
  const isPro = user?.role === 'creator';

  return {
    isPro,
    canAccessSponsorship: isPro,
    canAccessAnalytics: isPro,
    canAccessCustomDomain: isPro,
    canAccessDataExport: isPro,
    canAccessScheduling: isPro,
    canAccessPrioritySupport: isPro,
    canAccessAdvancedMaps: isPro,
    maxExpeditions: isPro ? Infinity : 3,
    maxPhotosPerEntry: isPro ? 10 : 2,
  };
}

// Re-export ApiError for use in components
export { ApiError };
