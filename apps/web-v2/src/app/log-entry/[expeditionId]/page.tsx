import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { CreateEntryPage } from '@/app/pages/CreateEntryPage';

export const metadata: Metadata = { title: 'Log Entry', robots: 'noindex' };

export default function Page() {
  return <ProtectedRoute><CreateEntryPage /></ProtectedRoute>;
}
