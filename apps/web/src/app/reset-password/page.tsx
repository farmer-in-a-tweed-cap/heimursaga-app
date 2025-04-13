import { LogoBrandDark } from '@repo/ui/components';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { apiClient } from '@/lib/api';

import { ChangePasswordForm, ResetPasswordForm } from '@/components';
import { AppLayout, AuthLayout } from '@/layouts';
import { ROUTER } from '@/router';

export default async function Page({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const token = searchParams?.token;

  const tokenValid = token
    ? await apiClient
        .validateToken(token)
        .then(({ success }) => (success ? true : false))
        .catch(() => false)
    : false;

  // if the token is not valid then redirect to the home page
  if (token && !tokenValid) {
    redirect(ROUTER.HOME);
  }

  return (
    <AuthLayout>
      <div className="flex min-h-screen w-full justify-center p-6 md:p-8">
        <div className="w-full max-w-md flex flex-col justify-start items-center gap-6">
          <div className="w-full max-w-[140px]">
            <Link href={ROUTER.HOME}>
              <LogoBrandDark />
            </Link>
          </div>
          <div className="w-full">
            {token ? (
              <ChangePasswordForm token={token} />
            ) : (
              <ResetPasswordForm />
            )}
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
