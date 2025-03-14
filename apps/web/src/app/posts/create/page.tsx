import { PostCreateForm } from '@/components/post';

import { AppLayout } from '@/layouts';

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-3xl bg-white p-6 rounded-xl">
        <h2 className="text-xl font-medium">Create post</h2>
        <div className="mt-6">
          <PostCreateForm />
        </div>
      </div>
    </AppLayout>
  );
}
