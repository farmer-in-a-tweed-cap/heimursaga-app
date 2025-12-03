import React from 'react';
import { UserRole } from '@repo/types';
import '@repo/ui/globals.css';
import '../styles.css';
import { cn } from '@repo/ui/lib/utils';
import { Metadata, Viewport } from 'next';
import Head from 'next/head';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import { Lato, Sulphur_Point } from 'next/font/google';

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  display: 'swap',
});

const sulphurPoint = Sulphur_Point({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
  variable: '--font-sulphur-point',
});

import { apiClient } from '@/lib/api';

import {
  AppBottomNavbar,
  AppFooter,
  AppProvider,
  AppSidebar,
  AppTopNavbar,
  IAppContextStateConfig,
  Logo,
  ThemeProviderWrapper,
} from '@/components';
import { SessionGuard } from '@/components/session/session-guard';
import { CookieConsent } from '@/components/cookie-consent';
import { APP_CONFIG } from '@/config';
import { SessionProvider } from '@/contexts';
import { ROUTER } from '@/router';

import './../styles.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_BASE_URL || 'https://heimursaga.com'),
  title: {
    template: `%s | ${APP_CONFIG.APP.NAME}`,
    default: `${APP_CONFIG.APP.NAME} - Share Your Stories, Raise Money, Inspire the World`,
  },
  description: 'Heimursaga is a travel journaling and fundraising platform. Document your travels with geo-tagged journal entries, connect with fellow explorers, and raise money from sponsors who support your adventures.',
  keywords: ['Heimursaga', 'travel journal', 'travel blog', 'explorer', 'geo-tagged entries', 'travel sponsorship', 'adventure funding', 'travel community', 'journey mapping'],
  authors: [{ name: 'The Peripety Company' }],
  openGraph: {
    title: `${APP_CONFIG.APP.NAME} - Share Your Stories, Raise Money, Inspire the World`,
    description: 'Document your travels with geo-tagged journal entries, connect with fellow explorers, and raise money from sponsors who support your adventures.',
    url: process.env.NEXT_PUBLIC_APP_BASE_URL,
    siteName: APP_CONFIG.APP.NAME,
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Heimursaga - Share Your Stories, Raise Money, Inspire the World',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_CONFIG.APP.NAME} - Share Your Stories, Raise Money, Inspire the World`,
    description: 'Document your travels with geo-tagged journal entries, connect with fellow explorers, and raise money from sponsors who support your adventures.',
    creator: '@heimursaga',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  minimumScale: 1.0,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#4676AC',
};

const { MAPBOX_ACCESS_TOKEN } = process.env;

type Props = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: Props) {
  const config: IAppContextStateConfig = {
    mapbox: {
      token: MAPBOX_ACCESS_TOKEN as string,
    },
  };

  return (
    <html lang="en">
      <head>
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <script
            src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
            async
            defer
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Apply theme immediately to prevent flash
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || 'system';
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const shouldBeDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);

                  if (shouldBeDark) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();

              // Mobile viewport height fix
              function setVH() {
                const vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', vh + 'px');
                document.documentElement.style.setProperty('--mobile-vh', window.innerHeight + 'px');
              }

              // Set on load
              setVH();

              // Update on resize and orientation change
              window.addEventListener('resize', setVH);
              window.addEventListener('orientationchange', function() {
                setTimeout(setVH, 100);
              });

              // Prevent zoom on iOS
              document.addEventListener('gesturestart', function (e) {
                e.preventDefault();
              });

              // Fix iOS viewport height issues
              if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                document.documentElement.style.setProperty('--ios-vh', window.innerHeight + 'px');
              }
            `,
          }}
        />
      </head>
      <body className={`${lato.className} ${sulphurPoint.variable}`}>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RCFRCB2E0L"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-RCFRCB2E0L');
          `}
        </Script>

        <ThemeProviderWrapper>
          <AppProvider config={config}>
            {children}
            <CookieConsent />
          </AppProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}

const SessionLayout = ({
  children,
  initialSession,
}: Props & { initialSession?: any }) => {
  return <SessionProvider state={initialSession}>{children}</SessionProvider>;
};

const AppLayout = ({
  children,
  initialSession,
  secure = true,
}: {
  children: React.ReactNode;
  initialSession?: any;
  secure?: boolean;
}) => {
  return (
    <SessionLayout initialSession={initialSession}>
      <SessionGuard secure={secure}>
        <div className="w-full min-h-dvh bg-gray-50 dark:bg-gray-900 text-black dark:text-white flex flex-row">
          <AppSidebar collapsed={true} />
          <AppTopNavbar />
          <div className="relative w-full flex flex-col justify-start">
            <div className="z-20 fixed left-0 right-0 bottom-0 w-full h-[70px] flex flex-row items-center lg:hidden">
              <AppBottomNavbar />
            </div>
            <div className="z-10 w-full h-auto flex flex-col pb-[70px] pt-16 lg:pt-16">
              <div className="w-full h-auto flex flex-col py-6 px-4 items-center justify-start">
                {children}
              </div>
            </div>
          </div>
        </div>
      </SessionGuard>
    </SessionLayout>
  );
};

const MapLayout = ({
  children,
  initialSession,
  secure = true,
}: {
  children: React.ReactNode;
  initialSession?: any;
  secure?: boolean;
}) => {
  return (
    <SessionLayout initialSession={initialSession}>
      <SessionGuard secure={secure}>
        <div className="w-full h-dvh bg-gray-50 dark:bg-gray-900 text-black dark:text-white flex flex-row overflow-hidden">
          <AppSidebar collapsed={true} />
          <AppTopNavbar />
          <div className="relative w-full h-dvh flex flex-col justify-start">
            <div className="z-20 fixed left-0 right-0 bottom-0 w-full h-[70px] flex flex-row items-center lg:hidden">
              <AppBottomNavbar />
            </div>
            <div className="z-10 w-full h-dvh relative pb-[70px] pt-16 lg:pb-0 lg:pt-16">
              {children}
            </div>
          </div>
        </div>
      </SessionGuard>
    </SessionLayout>
  );
};

const LoginLayout = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const cookie = cookies().toString();

  const sessionQuery = await apiClient.getSession({ cookie });
  const logged = !!sessionQuery.data || null;

  // if logged, redirect to the home page
  if (logged) return redirect(ROUTER.HOME);

  return (
    <div className="w-full min-h-dvh bg-dark text-dark-foreground flex flex-col items-center justify-start pt-16 desktop:pt-20 force-dark-bg">
      <div className="w-full max-w-[240px] -ml-6 mb-12">
        <Link href={ROUTER.HOME}>
          <Logo size="xlg" color="light" />
        </Link>
      </div>
      <div className="w-full h-auto max-w-md flex flex-col items-center justify-center p-4 desktop:p-0">
        {children}
      </div>
    </div>
  );
};

const AdminLayout = ({ 
  children,
  initialSession 
}: { 
  children: React.ReactNode;
  initialSession?: any;
}) => {
  return (
    <SessionLayout initialSession={initialSession}>
      <SessionGuard secure={true} roles={[UserRole.ADMIN]}>
        <div className="w-full min-h-dvh bg-gray-50 dark:bg-gray-900 text-black dark:text-white flex flex-row">
          <AppSidebar collapsed={true} />
          <div className="relative w-full flex flex-col justify-start">
            <div className="w-full h-auto flex flex-col py-6 px-4 items-center justify-start">
              {children}
            </div>
          </div>
        </div>
      </SessionGuard>
    </SessionLayout>
  );
};

const CheckoutLayout = ({ 
  children,
  initialSession 
}: { 
  children: React.ReactNode;
  initialSession?: any;
}) => {
  return (
    <SessionLayout initialSession={initialSession}>
      <SessionGuard secure={true}>
        <div className="w-full h-[55px] bg-white flex flex-row justify-center items-center border-b border-solid border-gray-200">
          <Link href={ROUTER.HOME}>
            <Logo color="dark" size="lg" />
          </Link>
        </div>
        <div className="w-full bg-gray-50 text-black flex flex-row justify-center items-start">
          <div className="w-full max-w-5xl flex flex-col p-4">{children}</div>
        </div>
      </SessionGuard>
    </SessionLayout>
  );
};

const AppLayoutWithoutSidebar = ({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: any;
}) => {
  return (
    <SessionLayout initialSession={initialSession}>
      <SessionGuard secure={true}>
        <div className="w-full min-h-dvh bg-gray-50 text-black flex flex-col justify-start">
          <div className="w-full h-auto min-h-dvh flex flex-col py-6 items-center justify-start">
            {children}
          </div>
          <AppFooter />
        </div>
      </SessionGuard>
    </SessionLayout>
  );
};

// Export layout components
export { 
  SessionLayout,
  AppLayout, 
  MapLayout,
  LoginLayout,
  AdminLayout,
  CheckoutLayout,
  AppLayoutWithoutSidebar 
};
