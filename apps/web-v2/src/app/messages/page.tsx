import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { MessagesPage } from '@/app/pages/MessagesPage';

export const metadata: Metadata = { title: 'Messages', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <MessagesPage />
    </ProtectedRoute>
  );
}
