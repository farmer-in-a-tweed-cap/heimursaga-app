import { Metadata } from 'next';

import { AppProvider, RootLayout } from '@/components';

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
    <RootLayout>
      <AppProvider>{children}</AppProvider>
    </RootLayout>
  );
}
