'use client';

import {
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components';
import { useState } from 'react';

import { PostCard, UserPostFeed } from '@/components';

type Props = {
  username: string;
};

const TABS = {
  FEED: 'feed',
  BOOKMARKS: 'bookmarks',
  FOLLOWING: 'following',
  FOLLOWERS: 'followers',
};

export const UserFeed: React.FC<Props> = ({ username }) => {
  const [{ tab }, setState] = useState<{ tab: string }>({ tab: TABS.FEED });

  return (
    <Tabs defaultValue={tab} className="w-full flex flex-col gap-1">
      <TabsList asChild>
        <Card className="bg-white flex flex-row justify-start gap-5 py-3 px-5">
          {[TABS.FEED, TABS.BOOKMARKS, TABS.FOLLOWING, TABS.FOLLOWERS].map(
            (tab, key) => (
              <TabsTrigger
                key={key}
                value={tab}
                className="capitalize border-b-2 text-neutral-500 text-sm border-solid border-transparent py-2 hover:border-neutral-300 data-[state=active]:border-black data-[state=active]:text-black "
              >
                {tab}
              </TabsTrigger>
            ),
          )}
        </Card>
      </TabsList>
      <TabsContent value="feed">
        <UserPostFeed username={username} />
      </TabsContent>
      <TabsContent value={TABS.BOOKMARKS}>
        <div className="w-full flex flex-col gap-2 px-4">bookmarks</div>
      </TabsContent>

      <TabsContent value={TABS.FOLLOWING}>
        <div className="w-full flex flex-col gap-2 px-4">following</div>
      </TabsContent>

      <TabsContent value={TABS.FOLLOWERS}>
        <div className="w-full flex flex-col gap-2 px-4">followers</div>
      </TabsContent>
    </Tabs>
  );
};
