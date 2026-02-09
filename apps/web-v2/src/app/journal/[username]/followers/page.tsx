import type { Metadata } from 'next';
import { FollowersPage } from '@/app/pages/FollowersPage';

export const metadata: Metadata = {
  title: 'Followers',
  robots: 'noindex',
};

export default function Page() {
  return <FollowersPage />;
}
