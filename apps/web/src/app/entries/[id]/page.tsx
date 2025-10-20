import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound } from '@/components/page';

import { PostCard, CommentSection } from '@/components';
import { AppLayout } from '@/layouts';
import { ROUTER } from '@/router';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const cookie = cookies().toString();

  const post = await apiClient
    .getPostById({ query: { id } }, { cookie })
    .then(({ data }) => data)
    .catch(() => null);

  if (!post) {
    return {
      title: 'Entry not found',
    };
  }

  const description = post.content 
    ? `${post.content.slice(0, 160)}${post.content.length > 160 ? '...' : ''}`
    : `Read this entry by ${post.author?.username || 'an explorer'} on Heimursaga.`;

  // Use entry media or author avatar as image
  const ogImage = post.media?.[0]?.thumbnail || post.author?.picture || '/og-image.jpg';

  return {
    title: `${post.title.slice(0, 120)}`,
    description,
    openGraph: {
      title: post.title,
      description,
      url: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/entries/${id}`,
      type: 'article',
      publishedTime: post.date ? new Date(post.date).toISOString() : undefined,
      authors: post.author?.username ? [`${post.author.username}`] : undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${post.title} by ${post.author?.username || 'Explorer'}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      creator: post.author?.username || undefined,
      images: [ogImage],
    },
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
            place={data.place}
            public={data.public}
            sponsored={data.sponsored}
            author={data.author}
            userbar={
              data?.author?.username
                ? { href: ROUTER.USERS.DETAIL(data.author.username) }
                : undefined
            }
            waypoint={data.waypoint}
            date={data.date}
            createdAt={data.createdAt}
            liked={data.liked}
            likesCount={data.likesCount}
            bookmarked={data.bookmarked}
            bookmarksCount={data.bookmarksCount}
            media={data?.media || []}
            trip={data.trip}
            actions={
              data.createdByMe
                ? { edit: true, share: true }
                : { like: true, bookmark: true, share: true }
            }
            extended
          />

          {/* Comments Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <CommentSection
              postId={data.id}
              commentsEnabled={data.commentsEnabled}
              initialCommentsCount={data.commentsCount}
              postAuthorUsername={data.author?.username}
            />
          </div>
        </div>
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
}
