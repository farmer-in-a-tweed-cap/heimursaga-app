import { Button, Card, CardContent, CardHeader } from '@repo/ui/components';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { PageNotFound } from '@/components/page';

import { PostCard } from '@/components';
import { AppLayout } from '@/layouts';
import type { PageProps } from '@/types';

export default async function Page({ params }: PageProps<{ post_id: string }>) {
  const cookie = cookies().toString();

  const { post_id: postId } = await params;

  const postQuery = await apiClient.getPostById({ postId }, { cookie });

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
            actions={
              createdByMe ? { edit: true } : { like: true, bookmark: true }
            }
          />
          {/* <Card>
            <CardHeader>
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
            </CardHeader>
            <CardContent>
              <div className="">
                <p>{content}</p>
              </div>
              <div className="mt-8">
                <MapPreview
                  href={ROUTER.EXPLORE.POST(postId)}
                  coordinates={{
                    lat,
                    lon,
                  }}
                />
              </div>
            </CardContent>
          </Card> */}
        </div>
      ) : (
        <PageNotFound />
      )}
    </AppLayout>
  );
}
