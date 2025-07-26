import { Metadata } from 'next';

import { UserGuide } from '@/components';
import { AppLayout } from '@/layouts';

export const metadata: Metadata = {
  title: 'User Guide',
  description: 'Learn how to use Heimursaga - create entries, plan journeys, and explore the world.',
};

export default function UserGuidePage() {
  return (
    <AppLayout secure={false}>
      <div className="w-full max-w-4xl">
        <UserGuide />
      </div>
    </AppLayout>
  );
}