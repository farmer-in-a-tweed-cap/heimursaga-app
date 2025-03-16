'use client';

import {
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import { useState } from 'react';

import { UserFollowingFeed, UserPostsFeed } from '@/components';

import { UserFollowersFeed } from './user-followers-feed';

type Props = {
  username: string;
};

const tabs: Record<
  'feed' | 'bookmarks' | 'followers' | 'following',
  { path: string; key: string }
> = {
  feed: {
    path: '',
    key: 'feed',
  },
  bookmarks: {
    path: 'bookmarks',
    key: 'bookmarks',
  },
  followers: {
    path: 'followers',
    key: 'followers',
  },
  following: {
    path: 'following',
    key: 'following',
  },
};

export const UserFeed: React.FC<Props> = ({ username }) => {
  const p = useParams();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const defaultTab = searchParams.get('v') || tabs.feed.key;

  const [{ tab }, setState] = useState<{ tab: string }>({ tab: defaultTab });

  const handleTabChange = (tab: string) => {
    console.log('tab change', tab);

    const s = new URLSearchParams(searchParams.toString());

    s.set('v', `${tab}`);

    router.push(`${pathname}?${s.toString()}`, { scroll: false });

    setState((state) => ({ ...state, tab }));
  };

  return (
    <Tabs defaultValue={tab} className="w-full flex flex-col gap-1">
      <TabsList asChild>
        <Card className="bg-white flex flex-row justify-start gap-5 py-3 px-5">
          {[tabs.feed.key, tabs.followers.key, tabs.following.key].map(
            (tab, key) => (
              <TabsTrigger
                key={key}
                value={tab}
                className="capitalize border-b-2 text-neutral-500 text-sm border-solid border-transparent py-2 hover:border-neutral-300 data-[state=active]:border-black data-[state=active]:text-black "
                onClick={() => handleTabChange(tab)}
              >
                {tab}
              </TabsTrigger>
            ),
          )}
        </Card>
      </TabsList>
      <TabsContent value={tabs.feed.key}>
        <UserPostsFeed username={username} />
      </TabsContent>
      <TabsContent value={tabs.bookmarks.key}>
        <div className="w-full flex flex-col gap-2 px-4">bookmarks</div>
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
