import type { Metadata } from 'next';
import { FollowingPage } from '@/app/pages/FollowingPage';

export const metadata: Metadata = {
  title: 'Following',
  robots: 'noindex',
};

export default function Page() {
  return <FollowingPage />;
}
