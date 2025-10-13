import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound, UserProfilePage } from '@/components';
import { AppLayout } from '@/layouts';

export type Props = {
  params: {
    username: string;
    section?: string;
  };
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const { username } = await params;

  const user = await apiClient
    .getUserByUsername({ username })
    .then(({ data }) => data)
    .catch(() => null);

  return {
    title: user ? `${user.username} | ${user.bio || ''}` : undefined,
  };
};

export const Page = async ({ params }: Props) => {
  const cookie = cookies().toString();
  const { username, section } = params;

  const [userQuery] = await Promise.all([
    await apiClient.getUserByUsername({ username }, { cookie }),
  ]);

  return (
    <AppLayout secure={false}>
      {userQuery.success && userQuery.data ? (
        <UserProfilePage user={userQuery.data} section={section} />
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
};

export default Page;
