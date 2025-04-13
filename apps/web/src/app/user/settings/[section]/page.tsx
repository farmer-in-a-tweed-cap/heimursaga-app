import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { UserSettings } from '@/components';
import { AppLayout } from '@/layouts';

type Props = {
  params: {
    section: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function Page({ params }: Props) {
  const cookie = cookies().toString();
  const { section } = params;

  const settings = {
    profile: await apiClient
      .getUserProfileSettings({ cookie })
      .then(({ data }) => data),
  };

  return (
    <AppLayout>
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <UserSettings
          section={section}
          data={{
            profile: settings.profile,
          }}
        />
      </div>
    </AppLayout>
  );
}
