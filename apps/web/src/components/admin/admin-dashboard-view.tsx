'use client';

import { TabNavbar } from '../nav';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

import { AdminDashboardPostsView } from './admin-dashboard-posts-view';
import { AdminDashboardUsersView } from './admin-dashboard-users-view';

const TABS = {
  POSTS: 'posts',
  USERS: 'users',
};

type Props = {
  section: string;
};

export const AdminDashboardView: React.FC<Props> = ({ section }) => {
  const router = useRouter();
  const session = useSession();

  const [tab, setTab] = useState<string>(section || TABS.POSTS);

  const tabs: { key: string; label: string }[] = [
    { key: TABS.POSTS, label: 'Entries' },
    { key: TABS.USERS, label: 'Users' },
  ];

  const handleTabChange = (tab: string) => {
    setTab(tab);
    router.push([ROUTER.ADMIN.HOME, tab].join('/'), {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col w-full">
      <div className="w-full flex flex-row">
        <TabNavbar
          tabs={tabs}
          activeTab={tab}
          classNames={{
            container: 'w-full justify-start',
            tabs: 'max-w-2xl',
          }}
          onChange={handleTabChange}
        />
      </div>
      <div className="mt-2 flex flex-col w-full py-4">
        {tab === TABS.POSTS && <AdminDashboardPostsView />}
        {tab === TABS.USERS && <AdminDashboardUsersView />}
      </div>
    </div>
  );
};
