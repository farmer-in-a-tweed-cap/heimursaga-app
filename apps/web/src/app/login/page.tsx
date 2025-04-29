import { LogoBrandDark } from '@repo/ui/components';
import { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/components';
import { LoginLayout } from '@/layouts';
import { ROUTER } from '@/router';

export const metadata: Metadata = {
  title: 'Log in',
};

export default async function Page() {
  return (
    <LoginLayout>
      <div className="flex w-full justify-center p-6 md:p-8">
        <div className="w-full max-w-md flex flex-col justify-start items-center gap-6">
          <div className="w-full max-w-[140px]">
            <Link href={ROUTER.HOME}>
              <LogoBrandDark />
            </Link>
          </div>
          <div className="w-full">
            <LoginForm />
          </div>
        </div>
      </div>
    </LoginLayout>
  );
}
