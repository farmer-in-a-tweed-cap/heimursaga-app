import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound } from '@/components/page';

import { PostCard } from '@/components';
import { AppLayout } from '@/layouts';

type Props = {
  params: { post_id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { post_id } = await params;

  const post = await apiClient
    .getPostById({ query: { id: post_id } })
    .then(({ data }) => data)
    .catch(() => null);

  return {
    title: post ? `${post.title.slice(0, 120)}` : undefined,
  };
}

export default async function Page({ params }: Props) {
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
    <AppLayout secure={true}>
      {postQuery.success ? (
        <div className="w-full max-w-3xl">
          <PostCard
            {...{ id, title, content, lat, lon, author }}
            coordinates={{ lat, lon }}
            actions={
              createdByMe ? { edit: true } : { like: true, bookmark: true }
            }
            extended
          />
        </div>
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
}
