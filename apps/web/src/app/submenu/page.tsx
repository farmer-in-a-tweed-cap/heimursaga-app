import { Metadata } from 'next';

import { apiClient } from '@/lib/api';

import {
  PageHeaderTitle,
  UserBar,
  UserBookmarks,
  UserYouMenu,
  UserYouHeader,
} from '@/components';
import { useSession } from '@/hooks';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Submenu',
};

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <UserYouHeader />
        <UserYouMenu />
      </div>
    </AppLayout>
  );
}
