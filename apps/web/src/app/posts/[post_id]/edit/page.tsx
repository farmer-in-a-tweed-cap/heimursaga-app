import { Card, CardContent, CardHeader } from '@repo/ui/components';
import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PostEditForm } from '@/components/post';

import { PageHeaderTitle, PageNotFound } from '@/components';
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

  return (
    <AppLayout>
      {postQuery.success ? (
        <div className="w-full max-w-3xl flex flex-col gap-6">
          <PageHeaderTitle>Edit post</PageHeaderTitle>
          <Card>
            <CardContent>
              <PostEditForm
                postId={postId}
                defaultValues={{
                  ...postQuery.data,
                }}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
}
