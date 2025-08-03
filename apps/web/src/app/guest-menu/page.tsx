import { Metadata } from 'next';
import Link from 'next/link';

import { ROUTER } from '@/router';
import { AppLayout } from '@/layouts';
import { Logo } from '@/components';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Menu',
};

export default async function Page() {
  return (
    <AppLayout secure={false}>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <h1 className="text-2xl font-medium text-center">Welcome to Heimursaga</h1>
          <p className="text-gray-600 text-center max-w-md">
            Share your stories, raise money, and inspire the world.
          </p>
        </div>

        {/* Navigation Menu */}
        <div className="flex flex-col gap-3 mt-4">
          {/* Authentication */}
          <div className="flex flex-col gap-2">
            <Link
              href={ROUTER.LOGIN}
              className="flex items-center justify-center py-4 px-6 text-lg font-medium text-white rounded-lg transition-colors shadow-lg"
              style={{ backgroundColor: '#AC6D46' }}
            >
              Log in
            </Link>
            <Link
              href={ROUTER.SIGNUP}
              className="flex items-center justify-center py-4 px-6 text-lg font-medium text-gray-900 bg-white border-2 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#AC6D46' }}
            >
              Create account
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4"></div>
          
          {/* Information Links */}
          <div className="flex flex-col gap-2">
            <Link
              href={ROUTER.USER_GUIDE}
              className="flex items-center py-3 px-4 text-base font-medium text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              User guide
            </Link>
            <Link
              href={ROUTER.LEGAL.PRIVACY}
              target="_blank"
              className="flex items-center py-3 px-4 text-base font-medium text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Privacy policy
            </Link>
            <Link
              href={ROUTER.LEGAL.TERMS}
              target="_blank"
              className="flex items-center py-3 px-4 text-base font-medium text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Terms and conditions
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}