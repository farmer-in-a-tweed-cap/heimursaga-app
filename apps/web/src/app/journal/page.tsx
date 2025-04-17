import { PageHeaderTitle, UserJournalPosts } from '@/components';
import { AppLayout } from '@/layouts';

export default async function Page() {
  return (
    <AppLayout>
      <div className="w-full max-w-2xl flex flex-col gap-4">
        <PageHeaderTitle>Journal</PageHeaderTitle>
        <UserJournalPosts />
      </div>
    </AppLayout>
  );
}
