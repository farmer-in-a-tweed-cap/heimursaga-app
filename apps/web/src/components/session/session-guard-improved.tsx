'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';
import { LogoSpinner } from '@/components/app/logo-spinner';

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only handle redirects on client side after hydration
    if (!isClient || session.isLoading) return;

    if (secure && !session.logged) {
      router.push(ROUTER.LOGIN);
      return;
    }

    if (secure && roles.length > 0 && session.role && !roles.includes(session.role)) {
      router.push(ROUTER.HOME);
      return;
    }
  }, [isClient, session.isLoading, session.logged, session.role, secure, roles, router]);

  // Show loading only while session is being fetched (not during hydration)
  if (!isClient) {
    return null; // Prevent hydration issues
  }

  if (session.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LogoSpinner size="md" />
      </div>
    );
  }

  // Don't show anything if redirecting
  if (secure && !session.logged) {
    return fallback ? <>{fallback}</> : null;
  }

  if (secure && roles.length > 0 && session.role && !roles.includes(session.role)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};