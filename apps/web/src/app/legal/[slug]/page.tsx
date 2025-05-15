import { NormalizedText } from '@repo/ui/components';
import { Metadata } from 'next';

import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

enum PageSlug {
  PRIVACY = 'privacy',
  TERMS = 'terms',
}

type PageProps = {
  params: {
    slug: PageSlug;
  };
};

const data = {
  terms: {
    title: 'terms of service',
    content: 'content',
  },
  privacy: {
    title: 'privacy policy',
    content: 'content',
  },
};

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;

  const page = data[slug as PageSlug];

  return {
    title: page.title,
  };
};

export default async function Page({ params }: PageProps) {
  const slug = params.slug;

  const page = data[slug];

  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>{page.title}</PageHeaderTitle>
        <div>
          <NormalizedText text={page.content} />
        </div>
      </div>
    </AppLayout>
  );
}
