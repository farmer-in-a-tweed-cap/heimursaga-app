import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound, UserProfilePage } from '@/components';
import { AppLayout } from '@/layouts';

type Props = {
  params: {
    username: string;
    section: string;
  };
};

export default async function Page({ params }: Props) {
  const cookie = cookies().toString();
  const { username, section } = params;

  const { success, data } = await apiClient.getUserByUsername(
    { username },
    { cookie },
  );

  return (
    <AppLayout>
      {success && data ? (
        <UserProfilePage user={data} section={section} />
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
}
