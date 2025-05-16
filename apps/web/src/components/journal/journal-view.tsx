'use client';

import { TabNavbar } from '../nav';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ROUTER } from '@/router';

import { JournalPostView } from './journal-post-view';

const TABS = {
  POSTS: 'posts',
};

type Props = {
  section: string;
};

export const JournalView: React.FC<Props> = ({ section }) => {
  const router = useRouter();

  const [tab, setTab] = useState<string>(section || TABS.POSTS);

  const tabs: { key: string; label: string }[] = [
    { key: TABS.POSTS, label: 'Posts' },
  ];

  const handleTabChange = (tab: string) => {
    setTab(tab);
    router.push([ROUTER.JOURNAL.HOME, tab].join('/'), {
      scroll: false,
    });
  };

  useEffect(() => {
    if (!section) {
      router.push([ROUTER.SPONSORSHIP.HOME, TABS.POSTS].join('/'), {
        scroll: false,
      });
    }
  }, []);

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
        {tab === TABS.POSTS && <JournalPostView />}
      </div>
    </div>
  );
};
