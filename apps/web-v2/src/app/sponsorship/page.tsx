import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { SponsorshipPage } from '@/app/pages/SponsorshipPage';

export const metadata: Metadata = { title: 'Sponsorship Dashboard', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <SponsorshipPage />
    </ProtectedRoute>
  );
}
