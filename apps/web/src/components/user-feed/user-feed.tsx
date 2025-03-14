'use client';

import {
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui/components';
import { useState } from 'react';

import { UserPostCard } from '@/components';

type Props = {};

const TABS = {
  FEED: 'feed',
  BOOKMARKS: 'bookmarks',
  FOLLOWING: 'following',
  FOLLOWERS: 'followers',
};

export const UserFeed: React.FC<Props> = () => {
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
        <div className="w-full flex flex-col gap-2">
          {Array(10)
            .fill(0)
            .map((post, key) => (
              <UserPostCard
                key={key}
                author={{
                  firstName: 'jack',
                  username: 'jackyboy',
                  picture: '',
                }}
                date="Feb 15"
                thumbnail="https://images.alltrails.com/eyJidWNrZXQiOiJhc3NldHMuYWxsdHJhaWxzLmNvbSIsImtleSI6InVwbG9hZHMvcGhvdG8vaW1hZ2UvOTM1MDAwMTEvMjQzMDZhODk1Mzg3YjUyYTcxZTdiYTUyOWQyMDEyN2QuanBnIiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJqcGVnIiwicmVzaXplIjp7IndpZHRoIjoyMDQ4LCJoZWlnaHQiOjIwNDgsImZpdCI6Imluc2lkZSJ9LCJyb3RhdGUiOm51bGwsImpwZWciOnsidHJlbGxpc1F1YW50aXNhdGlvbiI6dHJ1ZSwib3ZlcnNob290RGVyaW5naW5nIjp0cnVlLCJvcHRpbWlzZVNjYW5zIjp0cnVlLCJxdWFudGlzYXRpb25UYWJsZSI6M319fQ=="
                content={`[f] We got to the MacRitchie Reservoir by taking the train to Caldecott and
      walking to the reservoir so we could start a hike there. We completed
      the nature track here all the way to the tree top walk, the jelutong
      tower and walkin..`}
              />
            ))}
        </div>
      </TabsContent>
      <TabsContent value={TABS.BOOKMARKS}>
        <div className="w-full flex flex-col gap-2">
          {Array(10)
            .fill(0)
            .map((post, key) => (
              <UserPostCard
                key={key}
                author={{
                  firstName: 'jack',
                  username: 'jackyboy',
                  picture: '',
                }}
                date="Feb 15"
                thumbnail="https://images.alltrails.com/eyJidWNrZXQiOiJhc3NldHMuYWxsdHJhaWxzLmNvbSIsImtleSI6InVwbG9hZHMvcGhvdG8vaW1hZ2UvOTM1MDAwMTEvMjQzMDZhODk1Mzg3YjUyYTcxZTdiYTUyOWQyMDEyN2QuanBnIiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJqcGVnIiwicmVzaXplIjp7IndpZHRoIjoyMDQ4LCJoZWlnaHQiOjIwNDgsImZpdCI6Imluc2lkZSJ9LCJyb3RhdGUiOm51bGwsImpwZWciOnsidHJlbGxpc1F1YW50aXNhdGlvbiI6dHJ1ZSwib3ZlcnNob290RGVyaW5naW5nIjp0cnVlLCJvcHRpbWlzZVNjYW5zIjp0cnVlLCJxdWFudGlzYXRpb25UYWJsZSI6M319fQ=="
                content={`[b]We got to the MacRitchie Reservoir by taking the train to Caldecott and
        walking to the reservoir so we could start a hike there. We completed
        the nature track here all the way to the tree top walk, the jelutong
        tower and walkin..`}
              />
            ))}
        </div>
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
