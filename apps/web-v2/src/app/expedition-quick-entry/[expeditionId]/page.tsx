import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { ExpeditionQuickEntryPage } from '@/app/pages/ExpeditionQuickEntryPage';

export const metadata: Metadata = { title: 'Edit Expedition', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <ExpeditionQuickEntryPage />
    </ProtectedRoute>
  );
}
