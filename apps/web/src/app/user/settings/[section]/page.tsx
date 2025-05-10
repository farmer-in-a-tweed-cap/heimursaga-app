import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageHeaderTitle, UserSettings } from '@/components';
import { AppLayout } from '@/layouts';

type Props = {
  params: {
    section: string;
  };
};

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings',
};

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
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Settings</PageHeaderTitle>
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
