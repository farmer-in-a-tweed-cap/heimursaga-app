import { Metadata } from 'next';

import { AppLayout } from '@/app/layout';
import { MessagesView } from '@/components/message';

export const metadata: Metadata = {
  title: 'Messages - Explorer Pro',
  description: 'Private messaging for Explorer Pro members',
};

export default function MessagesPage() {
  return (
    <AppLayout secure={true}>
      <MessagesView />
    </AppLayout>
  );
}