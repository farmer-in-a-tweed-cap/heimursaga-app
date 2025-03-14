import { Button } from '@repo/ui/components';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { apiClient } from '@/lib/api';

import { PageNotFound } from '@/components/page';

import { MapPreview } from '@/components';
import { AppLayout } from '@/layouts';
import { ROUTER } from '@/router';
import type { PageProps } from '@/types';

export default async function Page({ params }: PageProps<{ post_id: string }>) {
  const cookie = cookies().toString();

  const { post_id: postId } = await params;

  const postQuery = await apiClient.getPostById({ postId }, { cookie });

  const {
    title,
    content,
    lat = 0,
    lon = 0,
    createdByMe = false,
  } = postQuery.data || {};

  return (
    <AppLayout>
      {postQuery.success ? (
        <div className="w-full max-w-3xl bg-white p-6 rounded-xl">
          <div className="w-full flex flex-row items-start justify-between">
            <h2 className="text-xl font-medium">{title}</h2>
            <div>
              {createdByMe && (
                <Button variant="outline" asChild>
                  <Link href={ROUTER.POSTS.EDIT(postId)}>Edit</Link>
                </Button>
              )}
            </div>
          </div>
          <div className="mt-6">
            <p>{content}</p>
          </div>
          <div className="mt-8">
            <MapPreview
              coordinates={{
                lat,
                lon,
              }}
            />
          </div>
        </div>
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
}
