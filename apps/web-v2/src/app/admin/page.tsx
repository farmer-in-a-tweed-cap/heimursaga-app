import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { AdminDashboardPage } from '@/app/pages/AdminDashboardPage';

export const metadata: Metadata = { title: 'Admin Dashboard', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <AdminDashboardPage />
    </ProtectedRoute>
  );
}
