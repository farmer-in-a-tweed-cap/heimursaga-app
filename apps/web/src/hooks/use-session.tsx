'use client';

import { UserRole } from '@repo/types';
import { useContext } from 'react';

import { SessionContext } from '@/contexts';

export const useSession = () => {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  const { session, isLoading, error, refreshSession, clearSession } = context;
  const logged = !!session;

  const me = (username?: string) =>
    session?.username && username ? session.username === username : false;

  const creator = session?.username ? session.role === UserRole.CREATOR : false;

  return { 
    ...session, 
    logged, 
    me, 
    creator,
    isLoading,
    error,
    refreshSession,
    clearSession
  };
};
