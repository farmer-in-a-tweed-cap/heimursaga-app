import { Metadata } from 'next';

import { AppMapLayout } from '@/layouts';

export const metadata: Metadata = {
  title: 'saga',
  description: 'a journaling platform for travelers',
  openGraph: {
    title: 'saga',
    description: 'a journaling platform for travelers',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppMapLayout>{children}</AppMapLayout>;
}
