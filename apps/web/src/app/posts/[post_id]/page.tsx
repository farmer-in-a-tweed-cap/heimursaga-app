import { apiClient } from '@/lib/api';

import { PageNotFound } from '@/components/page';

import { MapPreview } from '@/components';
import { AppLayout } from '@/layouts';
import type { PageProps } from '@/types';

export default async function Page({ params }: PageProps<{ post_id: string }>) {
  const { post_id: postId } = await params;

  const postQuery = await apiClient.getPostById({ postId });

  const { title, content, lat = 0, lon = 0 } = postQuery.data || {};

  return (
    <AppLayout>
      {postQuery.success ? (
        <div className="w-full max-w-3xl bg-white p-6 rounded-xl">
          <h2 className="text-xl font-medium">{title}</h2>
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
