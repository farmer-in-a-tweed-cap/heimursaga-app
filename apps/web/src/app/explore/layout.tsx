import { Metadata } from 'next';

import { AppMapLayout } from '@/layouts';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppMapLayout>{children}</AppMapLayout>;
}
