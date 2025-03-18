import { cookies } from 'next/headers';

import { UserSettings } from '@/components';
import { AppLayout } from '@/layouts';

type Props = {
  params: {
    section: string;
  };
};

export default async function Page({ params }: Props) {
  const cookie = cookies().toString();
  const { section } = params;

  // const userQuery = await apiClient.getUserByUsername({ username }, { cookie });
  // const user = userQuery.data;

  return (
    <AppLayout>
      <div className="w-full flex flex-col justify-start items-center">
        <UserSettings section={section} />
      </div>
    </AppLayout>
  );
}
