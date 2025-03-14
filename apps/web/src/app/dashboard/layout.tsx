import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { apiClient } from '@/lib/api';

import { SessionProvider } from '@/contexts';
import { AppMapLayout } from '@/layouts';
import { ROUTER } from '@/router';

export const metadata: Metadata = {
  title: 'saga',
  description: 'a journaling platform for travelers',
  openGraph: {
    title: 'saga',
    description: 'a journaling platform for travelers',
  },
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookie = cookies().toString();
  const session = await apiClient.getSession({ cookie }).catch(() => null);

  if (!session) {
    return redirect(ROUTER.LOGIN);
  }

  return (
    <SessionProvider state={session}>
      <AppMapLayout>{children}</AppMapLayout>
    </SessionProvider>
  );
}
