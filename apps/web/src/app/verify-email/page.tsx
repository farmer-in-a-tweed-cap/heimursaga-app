import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { apiClient } from '@/lib/api';

import { Logo } from '@/components';
import { LoginLayout } from '@/layouts';
import { ROUTER } from '@/router';

export const metadata: Metadata = {
  title: 'Verify Email',
};

export default async function Page({
  searchParams,
}: {
  searchParams: { token: string };
}) {
  const token = searchParams?.token;

  if (!token) {
    redirect(ROUTER.INDEX);
  }

  let verified = false;
  let error = '';

  try {
    await apiClient.verifyEmail({ token });
    verified = true;
  } catch (e: any) {
    error = e?.response?.data?.message || 'Verification failed';
  }

  return (
    <LoginLayout>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">


        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {verified ? (
            <div className="text-center">
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  ✅ Email Verified Successfully!
                </h3>
                <p className="text-green-700">
                  Your email has been verified. You can now receive notifications and explore Heimursaga.
                </p>
              </div>
              <Link
                href={ROUTER.EXPLORE.HOME}
                className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Start Exploring
              </Link>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  ❌ Verification Failed
                </h3>
                <p className="text-red-700">
                  {error}
                </p>
              </div>
              <Link
                href={ROUTER.INDEX}
                className="flex w-full justify-center rounded-md bg-gray-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
              >
                Go Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </LoginLayout>
  );
}