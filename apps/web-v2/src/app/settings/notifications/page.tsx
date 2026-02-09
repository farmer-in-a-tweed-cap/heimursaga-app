import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { NotificationsSettingsPage } from '@/app/pages/NotificationsSettingsPage';

export const metadata: Metadata = { title: 'Notification Settings', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <NotificationsSettingsPage />
    </ProtectedRoute>
  );
}
