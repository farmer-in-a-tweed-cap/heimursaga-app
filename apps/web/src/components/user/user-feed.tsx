'use client';

import {
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { UserFollowingFeed, UserPosts } from '@/components';
import { useSession } from '@/hooks';

import { UserFollowersFeed } from './user-followers-feed';

type Props = {
  username: string;
};

const tabs: Record<
  'home' | 'followers' | 'following' | 'bookmarks' | 'drafts',
  { path: string; key: string }
> = {
  home: {
    path: '',
    key: 'home',
  },
  followers: {
    path: 'followers',
    key: 'followers',
  },
  following: {
    path: 'following',
    key: 'following',
  },
  bookmarks: {
    path: 'bookmarks',
    key: 'bookmarks',
  },
  drafts: {
    path: 'drafts',
    key: 'drafts',
  },
};

export const UserFeed: React.FC<Props> = ({ username }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const session = useSession();

  const you = session?.username === username;

  const defaultTab = searchParams.get('v') || tabs.home.key;

  const [{ tab }, setState] = useState<{ tab: string }>({ tab: defaultTab });

  const tabsVisible = you
    ? [
        tabs.home.key,
        tabs.followers.key,
        tabs.following.key,
        // tabs.bookmarks.key,
        // tabs.drafts.key,
      ]
    : [tabs.home.key, tabs.followers.key, tabs.following.key];

  const handleTabChange = (tab: string) => {
    const s = new URLSearchParams(searchParams.toString());

    s.set('v', `${tab}`);

    router.push(`${pathname}?${s.toString()}`, { scroll: false });

    setState((state) => ({ ...state, tab }));
  };

  return (
    <Tabs defaultValue={tab} className="w-full flex flex-col gap-1">
      <TabsList asChild>
        <Card className="bg-white flex flex-row justify-start px-5">
          {tabsVisible.map((tab, key) => (
            <TabsTrigger
              key={key}
              value={tab}
              className="capitalize border-b-2 text-neutral-500 text-sm border-solid border-transparent py-3 pt-6 px-4 hover:border-neutral-300 data-[state=active]:border-black data-[state=active]:text-black"
              onClick={() => handleTabChange(tab)}
            >
              {tab}
            </TabsTrigger>
          ))}
        </Card>
      </TabsList>
      <TabsContent value={tabs.home.key}>
        <UserPosts username={username} />
      </TabsContent>
      <TabsContent value={tabs.followers.key}>
        <UserFollowersFeed username={username} />
      </TabsContent>
      <TabsContent value={tabs.following.key}>
        <UserFollowingFeed username={username} />
      </TabsContent>
    </Tabs>
  );
};
