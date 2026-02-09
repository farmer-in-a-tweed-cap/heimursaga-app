import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { EditProfilePage } from '@/app/pages/EditProfilePage';

export const metadata: Metadata = { title: 'Edit Profile', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <EditProfilePage />
    </ProtectedRoute>
  );
}
