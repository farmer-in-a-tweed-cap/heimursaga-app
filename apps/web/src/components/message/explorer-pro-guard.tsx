'use client';

import { ReactNode } from 'react';
import { UserRole } from '@repo/types';
import { LockKeyIcon } from '@repo/ui/icons';
import { Button } from '@repo/ui/components';

import { useSession } from '@/hooks';

interface ExplorerProGuardProps {
  children: ReactNode;
}

export function ExplorerProGuard({ children }: ExplorerProGuardProps) {
  const session = useSession();

  // Show loading while session is resolving
  if (session.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Check if user is logged in and is Explorer Pro (creator role)
  if (!session.logged || session.role !== UserRole.CREATOR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-[rgb(170,108,70)]/10 rounded-full flex items-center justify-center">
              <LockKeyIcon className="w-8 h-8 text-[rgb(170,108,70)]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Explorer Pro Required</h1>
            <p className="text-gray-600 mb-6">
              Private messaging is exclusively available to Explorer Pro members. 
              Upgrade your account to connect and collaborate with other explorers.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full bg-[rgb(170,108,70)] hover:bg-[rgb(170,108,70)]/90">
                <a href="/upgrade">
                  Upgrade to Explorer Pro
                </a>
              </Button>
              <Button variant="ghost" asChild className="w-full">
                <a href="/">
                  Return to Home
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}