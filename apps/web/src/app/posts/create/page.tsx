import { Card, CardContent, CardHeader } from '@repo/ui/components';

import { PostCreateForm } from '@/components/post';

import { AppLayout } from '@/layouts';

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-medium">Create post</h2>
          </CardHeader>
          <CardContent>
            <PostCreateForm />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
