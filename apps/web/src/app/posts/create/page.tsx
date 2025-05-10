import { Card, CardContent } from '@repo/ui/components';
import { Metadata } from 'next';

import { PostCreateForm } from '@/components/post';

import { PageHeaderTitle } from '@/components';
import { AppLayout } from '@/layouts';

export const metadata: Metadata = {
  title: 'Create post',
};

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <PageHeaderTitle>Create a post</PageHeaderTitle>
        <Card>
          <CardContent>
            <PostCreateForm />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
