import { Card, CardContent, CardHeader } from '@repo/ui/components';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PostEditForm } from '@/components/post';

import { AppLayout } from '@/layouts';
import type { PageProps } from '@/types';

export default async function Page({ params }: PageProps<{ post_id: string }>) {
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
      <div className="w-full max-w-3xl">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-medium">Edit post</h2>
          </CardHeader>
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
