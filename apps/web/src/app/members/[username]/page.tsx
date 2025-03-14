import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound, UserFeed, UserProfileCard } from '@/components';
import { AppLayout } from '@/layouts';

type PageProps = {
  params: {
    username: string;
  };
};

export default async function Page({ params }: PageProps) {
  const cookie = cookies().toString();
  const { username } = params;

  const userQuery = await apiClient.getUserByUsername({ username }, { cookie });
  const user = userQuery.data;

  return (
    <AppLayout>
      {userQuery.success ? (
        <div className="w-full flex flex-col justify-start items-center">
          <div className="app-container w-full max-w-5xl flex flex-row justify-between gap-6">
            <div className="w-full max-w-[320px]">
              <div className="sticky top-6">
                <UserProfileCard
                  username={user?.username}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  me={user?.you}
                />
              </div>
            </div>
            <div className="basis-full flex flex-col h-auto">
              <UserFeed username={username} />
            </div>
          </div>
        </div>
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
}
