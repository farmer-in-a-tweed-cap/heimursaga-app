import { Metadata } from 'next';

import { SponsorshipView } from '@/components';
import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: {
    section: string;
  };
};

export const metadata: Metadata = {
  title: 'Sponsorship',
};

export default async function Page({ params }: PageProps) {
  const { section } = params;

  return (
    <AppLayout>
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <PageHeaderTitle>Sponsorship</PageHeaderTitle>
        <SponsorshipView section={section} />
      </div>
    </AppLayout>
  );
}
