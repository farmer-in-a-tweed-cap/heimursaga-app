import { Metadata } from 'next';

import { InsightView, PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';
import { getServerSession } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Insights',
};

type PageProps = {
  params: {
    section: string;
  };
};

export default async function Page({ params }: PageProps) {
  const session = await getServerSession();
  
  return (
    <AppLayout initialSession={session}>
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <PageHeaderTitle>Insights</PageHeaderTitle>
        <InsightView section="posts" />
      </div>
    </AppLayout>
  );
}
