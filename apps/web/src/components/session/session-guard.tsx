'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';
import { LogoSpinner } from '@/components/app/logo-spinner';

interface SessionGuardProps {
  children: React.ReactNode;
  secure?: boolean;
  roles?: string[];
  fallback?: React.ReactNode;
}

const SessionGuardContent: React.FC<SessionGuardProps> = ({
  children,
  secure = true,
  roles = [],
  fallback = null,
}) => {
  const session = useSession();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Wait for session to be resolved (either loaded with data or failed)
    // We need to wait if:
    // 1. Session is explicitly loading, OR  
    // 2. We haven't initialized yet AND there's cached data (wait for API validation)
    const hasCachedSession = typeof window !== 'undefined' && localStorage.getItem('session_cache');
    const shouldWaitForSession = session.isLoading || (!hasInitialized && hasCachedSession && !session.logged);
    
    if (shouldWaitForSession) {
      return;
    }

    // Mark as initialized once we have session state
    if (!hasInitialized) {
      setHasInitialized(true);
    }

    // Handle secure pages
    if (secure) {
      if (!session.logged) {
        // No session found, redirect to login
        router.push(ROUTER.LOGIN);
        return;
      }

      // Check role requirements
      if (roles.length > 0 && session.role) {
        const hasRequiredRole = roles.includes(session.role);
        if (!hasRequiredRole) {
          router.push(ROUTER.HOME);
          return;
        }
      }
    }
  }, [isMounted, session.isLoading, session.logged, session.role, secure, roles, router, hasInitialized]);

  // Show loading until mounted and initialized
  if (!isMounted || !hasInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <LogoSpinner size="md" />
      </div>
    );
  }

  // Show loading state while session is being validated
  if (session.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <LogoSpinner size="md" />
      </div>
    );
  }

  // Show fallback for secure pages without session
  if (secure && !session.logged) {
    return fallback ? <>{fallback}</> : null;
  }

  // Show fallback for role-protected pages
  if (secure && roles.length > 0 && session.role && !roles.includes(session.role)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

// Export the component directly now that we handle session at page level
export const SessionGuard: React.FC<SessionGuardProps> = SessionGuardContent;