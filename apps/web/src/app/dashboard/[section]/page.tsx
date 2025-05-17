import { Metadata } from 'next';

import { AdminDashboardView } from '@/components';
import { PageHeaderTitle } from '@/components';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: {
    section: string;
  };
};

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function Page({ params }: PageProps) {
  const { section } = params;

  return (
    <div className="w-full max-w-6xl flex flex-col gap-6">
      <PageHeaderTitle>Dashboard</PageHeaderTitle>
      <AdminDashboardView section={section} />
    </div>
  );
}
