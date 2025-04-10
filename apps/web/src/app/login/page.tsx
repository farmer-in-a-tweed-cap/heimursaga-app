import { LogoBrandDark } from '@repo/ui/components';
import Link from 'next/link';

import { LoginForm } from '@/components';
import { AuthLayout } from '@/layouts';
import { ROUTER } from '@/router';

export default async function Page() {
  return (
    <AuthLayout>
      <div className="flex w-full justify-center p-6 md:p-8">
        <div className="w-full max-w-md flex flex-col justify-start items-center gap-6">
          <div className="w-full max-w-[140px]">
            <Link href={ROUTER.HOME}>
              {' '}
              <LogoBrandDark />
            </Link>
          </div>
          <div className="w-full">
            <LoginForm />
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
