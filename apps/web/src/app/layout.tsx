import '@repo/ui/globals.css';
import { cn } from '@repo/ui/lib/utils';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import {
  AppFooter,
  AppHeader,
  AppProvider,
  AppSidebar,
  IAppContextState,
} from '@/components';
import { SessionProvider } from '@/contexts';

import './../styles.css';

export const metadata: Metadata = {
  title: 'saga',
  description: 'a journaling platform for travelers',
  openGraph: {
    title: 'saga',
    description: 'a journaling platform for travelers',
  },
};

const { MAPBOX_ACCESS_TOKEN } = process.env;

type Props = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: Props) {
  const state: IAppContextState = {
    mapbox: {
      token: MAPBOX_ACCESS_TOKEN as string,
    },
  };

  return (
    <html lang="en">
      <body>
        <AppProvider state={state}>{children}</AppProvider>
      </body>
    </html>
  );
}

export const SecureLayout = async ({ children }: Props) => {
  const cookie = cookies().toString();
  const sessionQuery = await apiClient.getSession({ cookie });

  return (
    <SessionProvider state={sessionQuery.data}>{children}</SessionProvider>
  );
};

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SecureLayout>
      <div className="w-full min-h-screen bg-[#EFEFEC] text-black flex flex-row">
        <AppSidebar />
        <div className="relative w-full flex flex-col justify-start">
          <div className="w-full h-auto flex flex-col py-6 px-4 items-center justify-start">
            {children}
          </div>
        </div>
      </div>
    </SecureLayout>
  );
};

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SecureLayout>
      <div className="w-full min-h-screen bg-[#EFEFEC] text-black flex flex-row">
        <div className="relative w-full flex flex-col justify-start">
          <div className="w-full h-auto flex flex-col py-6 px-4 items-center justify-start">
            {children}
          </div>
        </div>
      </div>
    </SecureLayout>
  );
};

export const AppMapLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SecureLayout>
      <div className="w-full bg-[#EFEFEC] text-black flex flex-row">
        <AppSidebar />
        <div className="relative w-full flex flex-col justify-start">
          {/* <div className={cn('z-20 absolute top-0 left-0 right-0 h-[64px]')}>
            <AppHeader />
          </div> */}
          <div className={cn('app-content-full-container')}>{children}</div>
        </div>
      </div>
    </SecureLayout>
  );
};

export const AppLayoutWithoutSidebar = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <SecureLayout>
      <div className="w-full min-h-screen bg-[#EFEFEC] text-black flex flex-col justify-start">
        {/* <AppHeader /> */}
        <div className="w-full h-auto min-h-screen flex flex-col py-6 items-center justify-start">
          {children}
        </div>
        <AppFooter />
      </div>
    </SecureLayout>
  );
};
