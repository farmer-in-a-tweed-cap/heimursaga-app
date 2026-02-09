import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { PreferencesSettingsPage } from '@/app/pages/PreferencesSettingsPage';

export const metadata: Metadata = { title: 'Preferences', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <PreferencesSettingsPage />
    </ProtectedRoute>
  );
}
