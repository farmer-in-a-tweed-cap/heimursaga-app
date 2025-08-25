import { Metadata } from 'next';

import { AppLayout } from '@/app/layout';
import { MessagesView } from '@/components/message';
import { requireServerSession } from '@/lib/auth/server-session';

export const metadata: Metadata = {
  title: 'Messages - Explorer Pro',
  description: 'Private messaging for Explorer Pro members',
};

export default async function MessagesPage() {
  const session = await requireServerSession();
  
  return (
    <AppLayout initialSession={session} secure={true}>
      <MessagesView />
    </AppLayout>
  );
}