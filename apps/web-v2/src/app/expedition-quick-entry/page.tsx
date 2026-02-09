import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { ExpeditionQuickEntryPage } from '@/app/pages/ExpeditionQuickEntryPage';

export const metadata: Metadata = { title: 'Quick Entry', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <ExpeditionQuickEntryPage />
    </ProtectedRoute>
  );
}
