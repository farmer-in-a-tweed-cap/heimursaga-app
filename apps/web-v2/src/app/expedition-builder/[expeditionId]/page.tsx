import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { ExpeditionBuilderPage } from '@/app/pages/ExpeditionBuilderPage';

export const metadata: Metadata = { title: 'Edit Expedition', robots: 'noindex' };

export default function Page() {
  return <ProtectedRoute><ExpeditionBuilderPage /></ProtectedRoute>;
}
