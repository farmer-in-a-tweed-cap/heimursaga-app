import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { NotificationsPage } from '@/app/pages/NotificationsPage';

export const metadata: Metadata = { title: 'Notifications', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <NotificationsPage />
    </ProtectedRoute>
  );
}
