import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound } from '@/components/page';

import { PostCard } from '@/components';
import { AppLayout } from '@/layouts';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const post = await apiClient
    .getPostById({ query: { id } })
    .then(({ data }) => data)
    .catch(() => null);

  return {
    title: post ? `${post.title.slice(0, 120)}` : undefined,
  };
}

export default async function Page({ params }: Props) {
  const cookie = cookies().toString();

  const { id: postId } = await params;

  const { success, data } = await apiClient.getPostById(
    { query: { id: postId } },
    { cookie },
  );

  return (
    <AppLayout secure={false}>
      {success && data ? (
        <div className="w-full max-w-3xl">
          <PostCard
            id={data.id}
            title={data.title}
            content={data.content}
            author={data.author}
            waypoint={data.waypoint}
            liked={data.liked}
            likesCount={data.likesCount}
            bookmarked={data.bookmarked}
            bookmarksCount={data.bookmarksCount}
            actions={
              data.createdByMe
                ? { edit: true }
                : { like: true, bookmark: true, share: true }
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
