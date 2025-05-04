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
      <div className="w-full max-w-3xl flex flex-col">
        <PageHeaderTitle>Sponsorship</PageHeaderTitle>
        <div className="flex flex-col mt-6">
          <SponsorshipView section={section} />
        </div>
      </div>
    </AppLayout>
  );
}
