'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  TabNavbar,
  UserFollowersFeed,
  UserFollowingFeed,
  UserPosts,
  UserJourneys,
} from '@/components';
import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

const SECTION_KEYS = {
  ENTRIES: 'entries',
  JOURNEYS: 'journeys',
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
};

const SECTION_LABELS = {
  ENTRIES: 'Entries',
  JOURNEYS: 'Journeys',
  FOLLOWERS: 'Followers',
  FOLLOWING: 'Following',
};

type Props = {
  username: string;
  section?: string;
  me?: boolean;
};

export const UserPageSections: React.FC<Props> = ({
  username,
  section = SECTION_KEYS.ENTRIES,
}) => {
  // Map old "home" section to "entries" for backward compatibility
  const normalizedSection = section === 'home' ? SECTION_KEYS.ENTRIES : section;
  const session = useSession();
  const router = useRouter();

  const me = session.me(username);
  const creator = session.creator;

  const [state, setState] = useState<{ section: string }>({
    section: normalizedSection,
  });

  let tabs: { key: string; label: string }[] = [];

  if (me) {
    tabs = [
      { key: SECTION_KEYS.ENTRIES, label: SECTION_LABELS.ENTRIES },
      ...(creator ? [{ key: SECTION_KEYS.JOURNEYS, label: SECTION_LABELS.JOURNEYS }] : []),
      { key: SECTION_KEYS.FOLLOWERS, label: SECTION_LABELS.FOLLOWERS },
      { key: SECTION_KEYS.FOLLOWING, label: SECTION_LABELS.FOLLOWING },
    ];
  } else {
    tabs = [
      { key: SECTION_KEYS.ENTRIES, label: SECTION_LABELS.ENTRIES },
      ...(creator ? [{ key: SECTION_KEYS.JOURNEYS, label: SECTION_LABELS.JOURNEYS }] : []),
      { key: SECTION_KEYS.FOLLOWING, label: SECTION_LABELS.FOLLOWING },
    ];
  }

  const sectionKey = state.section;

  const handleChange = (section: string) => {
    setState((state) => ({ ...state, section }));

    if (username) {
      router.push([ROUTER.USERS.DETAIL(username), section].join('/'), {
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
      <div className="mt-2 flex flex-col w-full max-w-2xl">
        {me ? (
          <>
            {sectionKey === SECTION_KEYS.ENTRIES && (
              <UserPosts username={username} />
            )}
            {sectionKey === SECTION_KEYS.JOURNEYS && creator && (
              <UserJourneys username={username} isOwnProfile={me} />
            )}
            {sectionKey === SECTION_KEYS.FOLLOWERS && (
              <UserFollowersFeed username={username} />
            )}
            {sectionKey === SECTION_KEYS.FOLLOWING && (
              <UserFollowingFeed username={username} />
            )}
          </>
        ) : (
          <>
            {sectionKey === SECTION_KEYS.ENTRIES && (
              <UserPosts username={username} />
            )}
            {sectionKey === SECTION_KEYS.JOURNEYS && creator && (
              <UserJourneys username={username} isOwnProfile={me} />
            )}
            {sectionKey === SECTION_KEYS.FOLLOWING && (
              <UserFollowingFeed username={username} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
