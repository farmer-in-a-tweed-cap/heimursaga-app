import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { SettingsPage } from '@/app/pages/SettingsPage';

export const metadata: Metadata = { title: 'Settings', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <SettingsPage />
    </ProtectedRoute>
  );
}
