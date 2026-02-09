import type { Metadata } from 'next';
import { AdminDashboardPage } from '@/app/pages/AdminDashboardPage';

export const metadata: Metadata = { title: 'Admin Dashboard', robots: 'noindex' };

export default function Page() {
  return <AdminDashboardPage />;
}
