import { Card, CardContent, CardHeader } from '@repo/ui/components';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PostEditForm } from '@/components/post';

import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit post',
};

type PageProps = {
  params: {
    post_id: string;
  };
};

export default async function Page({ params }: PageProps) {
  const cookie = cookies().toString();

  const { post_id: postId } = await params;

  const postQuery = await apiClient.getPostById(
    { query: { id: postId } },
    { cookie },
  );

  const {
    title,
    content,
    lat = 0,
    lon = 0,
    public: isPublic,
  } = postQuery.data || {};

  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Edit post</PageHeaderTitle>
        <Card>
          <CardContent>
            <PostEditForm
              postId={postId}
              defaultValues={{
                title,
                content,
                lat,
                lon,
                public: isPublic,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
