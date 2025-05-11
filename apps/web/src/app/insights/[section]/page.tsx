import { Metadata } from 'next';

import { CreatorInsightView, PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

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
  const { section } = params;
  return (
    <AppLayout>
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <PageHeaderTitle>Insights</PageHeaderTitle>
        <CreatorInsightView section={section} />
      </div>
    </AppLayout>
  );
}
