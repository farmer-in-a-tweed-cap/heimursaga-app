import { useQuery } from '@tanstack/react-query';
import { cookies } from 'next/headers';

import { apiClient, getSessionQuery } from '@/lib/api';

import { AppLayout, LoginForm } from '@/components';

export default async function Page() {
  const cookie = cookies().toString();

  // const session = await apiClient.getSession({ cookie });

  return (
    <AppLayout>
      <div className="flex min-h-screen w-full justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </AppLayout>
  );
}
