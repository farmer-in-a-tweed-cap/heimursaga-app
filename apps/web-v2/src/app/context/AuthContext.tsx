'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { authApi, SessionUser, ApiError, clearCsrfToken } from '@/app/services/api';

// Re-export SessionUser as User for backwards compatibility
export type User = SessionUser;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNewSignup: boolean;
  login: (login: string, password: string, remember?: boolean) => Promise<void>;
  signup: (email: string, username: string, password: string, recaptchaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearNewSignup: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewSignup, setIsNewSignup] = useState(false);

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

  // Check for existing session on mount
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const userData = await authApi.getUser();
        if (!cancelled) {
          setUser(userData);
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
    // Fetch user data after successful login
    await refreshUser();
  };

  const signup = async (email: string, username: string, password: string, recaptchaToken?: string) => {
    await authApi.signup({ email, username, password, recaptchaToken });
    // Fetch user data after successful signup (auto-logged in)
    await refreshUser();
    // Mark as new signup to trigger welcome modal
    setIsNewSignup(true);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      // Always clear local state, even if API call fails
      setUser(null);
      // Clear cached CSRF token so next login fetches a fresh one
      clearCsrfToken();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      isNewSignup,
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
// Explorer Pro is determined by role === 'creator'
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
    maxPhotosPerEntry: isPro ? Infinity : 10,
  };
}

// Re-export ApiError for use in components
export { ApiError };
