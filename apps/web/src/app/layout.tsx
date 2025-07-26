import { UserRole } from '@repo/types';
import '@repo/ui/globals.css';
import { cn } from '@repo/ui/lib/utils';
import { Metadata, Viewport } from 'next';
import Head from 'next/head';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { apiClient } from '@/lib/api';

import {
  AppBottomNavbar,
  AppFooter,
  AppProvider,
  AppSidebar,
  IAppContextStateConfig,
  Logo,
} from '@/components';
import { APP_CONFIG } from '@/config';
import { SessionProvider } from '@/contexts';
import { ROUTER } from '@/router';

import './../styles.css';

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_CONFIG.APP.NAME}`,
    default: `${APP_CONFIG.APP.NAME} - Share Your Journey, Raise Money, Inspire the World`,
  },
  description: 'Document your travels with geo-tagged journal entries, connect with fellow explorers, and raise money from sponsors who support your adventures. Join the community of modern explorers on Heimursaga.',
  keywords: ['travel journal', 'travel blog', 'explorer', 'geo-tagged entries', 'travel sponsorship', 'adventure funding', 'travel community', 'journey mapping'],
  authors: [{ name: 'The Peripety Company' }],
  openGraph: {
    title: `${APP_CONFIG.APP.NAME} - Share Your Journey, Raise Money, Inspire the World`,
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
        alt: 'Heimursaga - Share Your Journey, Raise Money, Inspire the World',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_CONFIG.APP.NAME} - Share Your Journey, Raise Money, Inspire the World`,
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
  initialScale: 1,
  width: 'device-width',
  viewportFit: 'cover',
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
      <body>
        <AppProvider config={config}>{children}</AppProvider>
      </body>
    </html>
  );
}

export const SessionLayout = async ({
  children,
  secure = true,
  roles = [],
}: Props & { roles?: string[]; secure?: boolean }) => {
  const cookie = cookies().toString();
  const session = await apiClient
    .getSession({ cookie })
    .then(({ data }) => data);

  if (secure) {
    // redirect to the login page
    if (!session) return redirect(ROUTER.LOGIN);

    // check roles
    if (session) {
      if (roles.length >= 1) {
        const access = roles.some((role) => role === session.role);
        if (!access) {
          return redirect(ROUTER.HOME);
        }
      }
    }
  }

  return <SessionProvider state={session}>{children}</SessionProvider>;
};

export const AppLayout = ({
  children,
  secure = true,
}: {
  children: React.ReactNode;
  secure?: boolean;
}) => {
  return (
    <SessionLayout secure={secure}>
      <div className="w-full min-h-dvh bg-background text-black flex flex-row">
        <AppSidebar />
        <div className="relative w-full flex flex-col justify-start">
          <div className="z-20 fixed left-0 right-0 bottom-0 w-full h-[70px] border-t border-solid border-accent flex flex-row items-center desktop:hidden">
            <AppBottomNavbar />
          </div>
          <div className="z-10 w-full h-auto flex flex-col pb-[70px]">
            <div className="w-full h-auto flex flex-col py-6 px-4 items-center justify-start">
              {children}
            </div>
          </div>
        </div>
      </div>
    </SessionLayout>
  );
};

export const MapLayout = ({
  children,
  secure = true,
}: {
  children: React.ReactNode;
  secure?: boolean;
}) => {
  return (
    <SessionLayout secure={secure}>
      <div className="w-full h-dvh bg-background text-black flex flex-row overflow-hidden">
        <AppSidebar collapsed={true} />
        <div className="relative w-full h-dvh flex flex-col justify-start">
          <div className="z-20 fixed left-0 right-0 bottom-0 w-full h-[70px] border-t border-solid border-accent flex flex-row items-center desktop:hidden">
            <AppBottomNavbar />
          </div>
          <div className="z-10 w-full h-dvh relative pb-[70px] desktop:pb-0">
            {children}
          </div>
        </div>
      </div>
    </SessionLayout>
  );
};

export const LoginLayout = async ({
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
    <div className="w-full min-h-dvh bg-dark text-dark-foreground flex flex-col items-center justify-center">
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

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionLayout roles={[UserRole.ADMIN]}>
      <div className="w-full min-h-dvh bg-background text-black flex flex-row">
        <AppSidebar collapsed={true} />
        <div className="relative w-full flex flex-col justify-start">
          <div className="w-full h-auto flex flex-col py-6 px-4 items-center justify-start">
            {children}
          </div>
        </div>
      </div>
    </SessionLayout>
  );
};

export const CheckoutLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionLayout>
      <div className="w-full h-[55px] bg-white flex flex-row justify-center items-center border-b border-solid border-gray-200">
        <Link href={ROUTER.HOME}>
          <Logo color="dark" size="lg" />
        </Link>
      </div>
      <div className="w-full bg-white text-black flex flex-row justify-center items-start">
        <div className="w-full max-w-5xl flex flex-col p-4">{children}</div>
      </div>
    </SessionLayout>
  );
};

export const AppLayoutWithoutSidebar = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <SessionLayout>
      <div className="w-full min-h-dvh bg-background text-black flex flex-col justify-start">
        <div className="w-full h-auto min-h-dvh flex flex-col py-6 items-center justify-start">
          {children}
        </div>
        <AppFooter />
      </div>
    </SessionLayout>
  );
};
