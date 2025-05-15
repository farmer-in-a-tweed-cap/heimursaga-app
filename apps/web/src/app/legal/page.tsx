import { Metadata } from 'next';
import Link from 'next/link';

import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';
import { ROUTER } from '@/router';

export const metadata: Metadata = {
  title: 'legal',
};

export default async function Page() {
  const links = [
    { href: ROUTER.LEGAL.PRIVACY, label: 'Privacy policy' },
    { href: ROUTER.LEGAL.TERMS, label: 'Terms of service' },
  ];

  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>legal</PageHeaderTitle>
        <ul className="flex flex-col justify-start items-start gap-2">
          {links.map(({ href, label }, key) => (
            <li key={key}>
              <Link className="underline" href={href}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppLayout>
  );
}
