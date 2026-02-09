import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { EditEntryPage } from '@/app/pages/EditEntryPage';

export const metadata: Metadata = { title: 'Edit Entry', robots: 'noindex' };

export default function Page() {
  return <ProtectedRoute><EditEntryPage /></ProtectedRoute>;
}
