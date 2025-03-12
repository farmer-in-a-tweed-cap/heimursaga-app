import '@repo/ui/globals.css';
import { Metadata } from 'next';
import Head from 'next/head';

import { AppProvider } from '@/components';

export const metadata: Metadata = {
  title: 'saga',
  description: 'a journaling platform for travelers',
  openGraph: {
    title: 'saga',
    description: 'a journaling platform for travelers',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" href="/favicon.png" sizes="any" />
      </Head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
