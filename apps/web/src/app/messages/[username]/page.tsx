import { Metadata } from 'next';

import { AppLayout } from '@/app/layout';
import { ConversationView } from '@/components/message';

interface ConversationPageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: ConversationPageProps): Promise<Metadata> {
  return {
    title: `Messages with ${params.username} - Explorer Pro`,
    description: `Private conversation with Explorer Pro member ${params.username}`,
  };
}

export default function ConversationPage({ params }: ConversationPageProps) {
  return (
    <AppLayout secure={true}>
      <ConversationView recipientUsername={params.username} />
    </AppLayout>
  );
}