import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { apiClient } from '@/lib/api';

import { ChangePasswordForm, Logo, ResetPasswordForm } from '@/components';
import { LoginLayout } from '@/layouts';
import { ROUTER } from '@/router';

export const metadata: Metadata = {
  title: 'Reset password',
};

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
  // if (token && !tokenValid) {
  //   redirect(ROUTER.HOME);
  // }

  return (
    <LoginLayout>
      {token ? <ChangePasswordForm token={token} /> : <ResetPasswordForm />}
    </LoginLayout>
  );
}
