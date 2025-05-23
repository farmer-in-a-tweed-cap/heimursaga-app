import '@repo/ui/globals.css';
import { cn } from '@repo/ui/lib/utils';
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { apiClient } from '@/lib/api';

import {
  AppFooter,
  AppProvider,
  AppSidebar,
  AppTopNavbar,
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
    default: `${APP_CONFIG.APP.NAME}`,
  },
  description: 'a journaling platform for travelers',
  openGraph: {
    title: `${APP_CONFIG.APP.NAME}`,
    description: 'a journaling platform for travelers',
  },
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
}: Props & { secure?: boolean }) => {
  const cookie = cookies().toString();
  const sessionQuery = await apiClient.getSession({ cookie });
  const logged = !!sessionQuery.data || null;

  // protect private routes
  if (secure) {
    // if not logged, redirect to the login page
    if (!logged) return redirect(ROUTER.LOGIN);
  }

  return (
    <SessionProvider state={sessionQuery.data}>{children}</SessionProvider>
  );
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
      <div className="w-full min-h-screen bg-background text-black flex flex-row">
        <AppSidebar />
        <div className="relative w-full flex flex-col justify-start">
          <div className="z-20 hidden desktop:flex items-center w-full h-[60px] bg-background">
            <AppTopNavbar />
          </div>
          <div className="z-10 w-full h-auto flex flex-col py-6 px-4 items-center justify-start">
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
    <div className="w-full min-h-screen bg-background text-black flex flex-row">
      <div className="relative w-full flex flex-col items-center justify-start py-14">
        <div className="w-full max-w-[140px]">
          <Link href={ROUTER.HOME}>
            <Logo size="lg" color="dark" />
          </Link>
        </div>
        <div className="mt-4 w-full h-auto max-w-md flex flex-col items-center justify-start">
          {children}
        </div>
      </div>
    </div>
  );
};

export const AppMapLayout = ({
  children,
  secure = true,
}: {
  children: React.ReactNode;
  secure?: boolean;
}) => {
  return (
    <SessionLayout secure={secure}>
      <div className="w-full bg-background text-black flex flex-row">
        <AppSidebar collapsed={true} />
        <div className="relative w-full h-screen flex flex-col justify-start">
          <div className="z-20 sticky desktop:hidden flex items-center w-full h-[60px] bg-background">
            <AppTopNavbar />
          </div>
          <div className="z-10 w-full h-full relative">{children}</div>
        </div>
      </div>
    </SessionLayout>
  );
};

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <SessionLayout>
      <div className="w-full min-h-screen bg-background text-black flex flex-row">
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
          <Logo color="dark" size="sm" />
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
      <div className="w-full min-h-screen bg-background text-black flex flex-col justify-start">
        <div className="w-full h-auto min-h-screen flex flex-col py-6 items-center justify-start">
          {children}
        </div>
        <AppFooter />
      </div>
    </SessionLayout>
  );
};
