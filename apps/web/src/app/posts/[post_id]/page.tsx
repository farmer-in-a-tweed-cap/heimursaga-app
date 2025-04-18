import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound } from '@/components/page';

import { PostCard } from '@/components';
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
    id,
    title,
    content,
    lat = 0,
    lon = 0,
    author,
    createdByMe = false,
  } = postQuery.data || {};

  return (
    <AppLayout>
      {postQuery.success ? (
        <div className="w-full max-w-3xl">
          <PostCard
            {...{ id, title, content, lat, lon, author }}
            coordinates={{ lat, lon }}
            actions={
              createdByMe ? { edit: true } : { like: true, bookmark: true }
            }
          />
        </div>
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
}
