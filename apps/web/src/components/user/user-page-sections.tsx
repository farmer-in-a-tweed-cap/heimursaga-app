'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  TabNavbar,
  UserFollowersFeed,
  UserFollowingFeed,
  UserPosts,
} from '@/components';
import { ROUTER } from '@/router';

const SECTION_KEYS = {
  HOME: 'home',
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
};

type Props = {
  username: string;
  section?: string;
  me?: boolean;
};

export const UserPageSections: React.FC<Props> = ({
  username,
  section = SECTION_KEYS.HOME,
  me = false,
}) => {
  const router = useRouter();

  const [state, setState] = useState<{ section: string }>({
    section,
  });

  const tabs: { key: string; label: string }[] = [
    { key: SECTION_KEYS.HOME, label: 'Home' },
    { key: SECTION_KEYS.FOLLOWERS, label: 'Followers' },
    { key: SECTION_KEYS.FOLLOWING, label: 'Following' },
  ];

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
          tabs={tabs}
          activeTab={sectionKey}
          classNames={{
            container: 'w-full',
            tabs: 'max-w-2xl',
          }}
          onChange={handleChange}
        />
      </div>
      <div className="mt-4 flex flex-col w-full max-w-2xl">
        {sectionKey === SECTION_KEYS.HOME && <UserPosts username={username} />}
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
