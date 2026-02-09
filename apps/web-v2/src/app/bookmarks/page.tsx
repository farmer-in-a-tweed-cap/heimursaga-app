import type { Metadata } from 'next';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { BookmarksPage } from '@/app/pages/BookmarksPage';

export const metadata: Metadata = { title: 'Bookmarks', robots: 'noindex' };

export default function Page() {
  return (
    <ProtectedRoute>
      <BookmarksPage />
    </ProtectedRoute>
  );
}
