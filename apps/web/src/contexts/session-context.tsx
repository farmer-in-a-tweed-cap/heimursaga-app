'use client';

import { ISessionUser } from '@repo/types';
import { ReactNode, createContext, useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';
import { sessionDebugger } from '@/lib/session-debug';

interface SessionContextType {
  session?: ISessionUser;
  isLoading: boolean;
  error: Error | null;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
}

export const SessionContext = createContext<SessionContextType | undefined>(
  undefined,
);

export function SessionProvider({
  state,
  children,
}: {
  state?: ISessionUser;
  children: ReactNode;
}) {
  const [clientSession, setClientSession] = useState<ISessionUser | undefined>(state);
  const [error, setError] = useState<Error | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const queryClient = useQueryClient();

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Log initialization
  useEffect(() => {
    sessionDebugger.log('SessionProvider initialized', { 
      hasServerState: !!state,
      serverStateUsername: state?.username 
    });
  }, [state]);

  // Client-side session validation query
  const sessionQuery = useQuery({
    queryKey: [API_QUERY_KEYS.GET_SESSION_USER],
    queryFn: () => apiClient.getSession({}).then(({ data }) => data),
    enabled: isMounted, // Only run after component is mounted
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors (user not logged in)
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Sync server state with client state
  useEffect(() => {
    if (sessionQuery.data) {
      sessionDebugger.log('Session fetched successfully', { 
        username: sessionQuery.data.username,
        role: sessionQuery.data.role 
      });
      setClientSession(sessionQuery.data);
      setError(null);
      
      // Store in localStorage for persistence across hard refreshes
      try {
        localStorage.setItem('session_cache', JSON.stringify({
          data: sessionQuery.data,
          timestamp: Date.now(),
        }));
        sessionDebugger.log('Session cached to localStorage');
      } catch (e) {
        sessionDebugger.log('Failed to cache session in localStorage', null, e);
      }
    } else if (sessionQuery.error) {
      const error = sessionQuery.error as any;
      sessionDebugger.log('Session fetch error', { status: error?.status }, error);
      setError(sessionQuery.error as Error);
      
      // Clear session if there's an auth error
      if (error?.status === 401 || error?.status === 403) {
        sessionDebugger.log('Clearing session due to auth error');
        setClientSession(undefined);
        try {
          localStorage.removeItem('session_cache');
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }
  }, [sessionQuery.data, sessionQuery.error]);

  // Try to restore session from localStorage on initial load
  useEffect(() => {
    if (isMounted && !state && !sessionQuery.data && !sessionQuery.isLoading) {
      try {
        const cached = localStorage.getItem('session_cache');
        if (cached) {
          sessionDebugger.log('Found cached session, attempting restore');
          const { data, timestamp } = JSON.parse(cached);
          const isStale = Date.now() - timestamp > 5 * 60 * 1000; // 5 minutes
          
          if (!isStale && data) {
            sessionDebugger.log('Restoring session from cache', { 
              username: data.username,
              cachedAt: new Date(timestamp).toISOString()
            });
            setClientSession(data);
            // Still trigger a background refresh to validate
            sessionQuery.refetch();
          } else {
            sessionDebugger.log('Cached session is stale, removing', { 
              age: Date.now() - timestamp 
            });
            localStorage.removeItem('session_cache');
          }
        } else {
          sessionDebugger.log('No cached session found');
        }
      } catch (e) {
        sessionDebugger.log('Failed to restore session from cache', null, e);
        try {
          localStorage.removeItem('session_cache');
        } catch (removeError) {
          // Ignore
        }
      }
    }
  }, [isMounted, state, sessionQuery.data, sessionQuery.isLoading]);

  const refreshSession = useCallback(async () => {
    try {
      sessionDebugger.log('Manually refreshing session');
      await sessionQuery.refetch();
    } catch (error) {
      sessionDebugger.log('Failed to refresh session', null, error);
      setError(error as Error);
    }
  }, [sessionQuery]);

  const clearSession = useCallback(() => {
    sessionDebugger.log('Manually clearing session');
    setClientSession(undefined);
    setError(null);
    queryClient.clear();
    try {
      localStorage.removeItem('session_cache');
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [queryClient]);

  // Use client session if available, otherwise fall back to server state
  const finalSession = clientSession || state;

  return (
    <SessionContext.Provider value={{ 
      session: finalSession, 
      isLoading: !isMounted || sessionQuery.isLoading,
      error,
      refreshSession,
      clearSession
    }}>
      {children}
    </SessionContext.Provider>
  );
}
