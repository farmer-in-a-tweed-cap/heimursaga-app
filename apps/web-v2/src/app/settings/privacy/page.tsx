import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { PrivacySettingsPage } from '@/app/pages/PrivacySettingsPage';

export const metadata: Metadata = { title: 'Privacy Settings', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <PrivacySettingsPage />
    </ProtectedRoute>
  );
}
