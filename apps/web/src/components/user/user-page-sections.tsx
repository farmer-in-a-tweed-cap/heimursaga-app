'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  TabNavbar,
  UserFollowersFeed,
  UserFollowingFeed,
  UserPostsFeed,
} from '@/components';
import { ROUTER } from '@/router';

const SECTION_KEYS = {
  HOME: 'home',
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
};

const SECTION_TABS: { key: string; label: string }[] = [
  { key: SECTION_KEYS.HOME, label: 'Home' },
  { key: SECTION_KEYS.FOLLOWERS, label: 'Followers' },
  { key: SECTION_KEYS.FOLLOWING, label: 'Following' },
];

type Props = {
  username: string;
  section?: string;
};

export const UserPageSections: React.FC<Props> = ({
  username,
  section = SECTION_KEYS.HOME,
}) => {
  const router = useRouter();

  const [state, setState] = useState<{ section: string }>({
    section,
  });

  const sectionKey = state.section;

  const handleChange = (section: string) => {
    setState((state) => ({ ...state, section }));

    if (username) {
      router.push([ROUTER.MEMBERS.MEMBER(username), section].join('/'), {
        scroll: false,
      });
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div className="w-full flex flex-row">
        <TabNavbar
          tabs={SECTION_TABS}
          activeTab={sectionKey}
          classNames={{
            container: 'w-full',
            tabs: 'max-w-2xl',
          }}
          onChange={handleChange}
        />
      </div>
      <div className="mt-4 flex flex-col w-full max-w-2xl">
        {sectionKey === SECTION_KEYS.HOME && (
          <UserPostsFeed username={username} />
        )}
        {sectionKey === SECTION_KEYS.FOLLOWERS && (
          <UserFollowersFeed username={username} />
        )}
        {sectionKey === SECTION_KEYS.FOLLOWING && (
          <UserFollowingFeed username={username} />
        )}
      </div>
    </div>
  );
};
