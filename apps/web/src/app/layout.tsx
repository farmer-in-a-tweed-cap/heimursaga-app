import '@repo/ui/globals.css';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { ReactQueryProvider } from '@/components';
import {
  AppContext,
  AppProvider,
  IAppContextState,
  SessionProvider,
} from '@/contexts';

export const metadata: Metadata = {
  title: 'saga',
  description: 'a journaling platform for travelers',
  openGraph: {
    title: 'saga',
    description: 'a journaling platform for travelers',
  },
};

const { MAPBOX_ACCESS_TOKEN } = process.env;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookie = cookies().toString();
  const session = await apiClient.getSession({ cookie }).catch(() => null);

  const state: IAppContextState = {
    mapbox: {
      token: MAPBOX_ACCESS_TOKEN as string,
    },
  };

  // if (!session) {
  //   return redirect(ROUTER.LOGIN);
  // }

  return (
    <html lang="en">
      <body>
        <AppProvider state={state}>
          <ReactQueryProvider>
            <SessionProvider state={session}>{children}</SessionProvider>
          </ReactQueryProvider>
        </AppProvider>
      </body>
    </html>
  );
}
