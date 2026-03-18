'use client';

import { Suspense } from 'react';
import { ThemeProvider } from '@/app/context/ThemeContext';
import { DistanceUnitProvider } from '@/app/context/DistanceUnitContext';
import { MapLayerProvider } from '@/app/context/MapLayerContext';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { StripeProvider } from '@/app/context/StripeContext';
import { PageOwnerProvider } from '@/app/context/PageOwnerContext';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { Header } from '@/app/components/Header';
import { ActiveExpeditionBanner } from '@/app/components/ActiveExpeditionBanner';
import { Footer } from '@/app/components/Footer';
import { WelcomeModal } from '@/app/components/WelcomeModal';
import { PostHogPageviewTracker } from '@/app/components/PostHogPageviewTracker';
import { CookieConsentBanner } from '@/app/components/CookieConsentBanner';
import { Toaster } from '@/app/components/ui/sonner';
import { usePathname } from 'next/navigation';

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const { user, isNewSignup, clearNewSignup, refreshUser } = useAuth();

  return (
    <>
      {/* Welcome Modal for new signups */}
      {user && isNewSignup && (
        <WelcomeModal
          open={isNewSignup}
          onClose={clearNewSignup}
          onSaveComplete={refreshUser}
          username={user.username}
        />
      )}

      <div className="min-h-screen flex flex-col bg-[#3a3a3a] dark:bg-[#2a2a2a] topo-bg">
        <ActiveExpeditionBanner />
        <Header />
        <div className={`flex-1 ${isHomePage ? '' : 'pt-[15px]'}`}>
          {children}
        </div>
        <Footer />
      </div>
      <CookieConsentBanner />
      <Toaster />
    </>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MapLayerProvider>
          <DistanceUnitProvider>
            <AuthProvider>
              <StripeProvider>
                <PageOwnerProvider>
                <AppContent>{children}</AppContent>
                </PageOwnerProvider>
                <Suspense fallback={null}>
                  <PostHogPageviewTracker />
                </Suspense>
              </StripeProvider>
            </AuthProvider>
          </DistanceUnitProvider>
        </MapLayerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
