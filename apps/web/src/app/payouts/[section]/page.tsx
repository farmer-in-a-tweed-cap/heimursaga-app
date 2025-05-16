import { Metadata } from 'next';

import { PageHeaderTitle, PayoutView } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payouts',
};

type PageProps = {
  params: {
    section: string;
  };
};

export default async function Page({ params }: PageProps) {
  const section = params.section;

  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Payouts</PageHeaderTitle>
        <PayoutView section={section} />
        {/* <UserPayoutBalance /> */}
      </div>
    </AppLayout>
  );
}
