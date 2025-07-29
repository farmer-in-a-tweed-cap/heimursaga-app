'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';
import { SessionRecovery } from './session-recovery';

interface SessionGuardProps {
  children: ReactNode;
  secure?: boolean;
  roles?: string[];
  fallback?: ReactNode;
}

export const SessionGuard: React.FC<SessionGuardProps> = ({
  children,
  secure = true,
  roles = [],
  fallback = null,
}) => {
  const session = useSession();
  const router = useRouter();
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    // Wait for session loading to complete
    if (session.isLoading) return;

    // Handle secure pages
    if (secure) {
      // If there's an error but no session, show recovery UI
      if (session.error && !session.logged) {
        setShowRecovery(true);
        return;
      }

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

    // Reset recovery state if session is recovered
    if (session.logged && showRecovery) {
      setShowRecovery(false);
    }
  }, [session.isLoading, session.logged, session.role, session.error, secure, roles, router, showRecovery]);

  // Show recovery UI for secure pages with session errors
  if (secure && showRecovery && session.error) {
    return (
      <SessionRecovery 
        onRecovered={() => {
          setShowRecovery(false);
        }}
      />
    );
  }

  // Show loading state while session is being validated
  if (session.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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