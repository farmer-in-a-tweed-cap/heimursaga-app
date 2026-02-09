'use client';

import { ThemeProvider } from '@/app/context/ThemeContext';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { StripeProvider } from '@/app/context/StripeContext';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { Header } from '@/app/components/Header';
import { Footer } from '@/app/components/Footer';
import { WelcomeModal } from '@/app/components/WelcomeModal';
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

      <div className="min-h-screen bg-[#404040] dark:bg-[#2a2a2a]">
        <Header />
        <div className={isHomePage ? '' : 'pt-[15px]'}>
          {children}
        </div>
        <Footer />
      </div>
    </>
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <StripeProvider>
            <AppContent>{children}</AppContent>
          </StripeProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
