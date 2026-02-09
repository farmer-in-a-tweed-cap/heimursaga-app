import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { InsightsPage } from '@/app/pages/InsightsPage';

export const metadata: Metadata = { title: 'Insights', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <InsightsPage />
    </ProtectedRoute>
  );
}
