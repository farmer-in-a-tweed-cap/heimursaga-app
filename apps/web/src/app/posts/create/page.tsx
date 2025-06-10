import { Card, CardContent } from '@repo/ui/components';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PostCreateForm } from '@/components/post';

import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

export const metadata: Metadata = {
  title: 'Create post',
};

type PageProps = {
  searchParams: {
    waypoint: number;
  };
};

export default async function Page({ searchParams }: PageProps) {
  const cookie = await cookies().toString();

  const waypointId = searchParams.waypoint;
  const waypoint = await apiClient
    .getWaypointById({
      query: { id: waypointId },
    })
    .then(({ data }) => data);

  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Create a post</PageHeaderTitle>
        <Card>
          <CardContent>
            <PostCreateForm waypoint={waypoint} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
