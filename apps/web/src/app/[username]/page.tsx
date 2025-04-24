import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound, UserProfilePage } from '@/components';
import { AppLayout } from '@/layouts';

type Props = {
  params: {
    username: string;
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  const user = await apiClient
    .getUserByUsername({ username })
    .then(({ data }) => data)
    .catch(() => null);

  return {
    title: user ? `${user.name} | ${user.bio || ''}` : undefined,
  };
}

export default async function Page({ params }: Props) {
  const cookie = cookies().toString();
  const { username } = params;

  const { success, data } = await apiClient.getUserByUsername(
    { username },
    { cookie },
  );

  return (
    <AppLayout>
      {success && data ? <UserProfilePage user={data} /> : <PageNotFound />}
    </AppLayout>
  );
}
