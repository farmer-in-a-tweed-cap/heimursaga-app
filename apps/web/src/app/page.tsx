import { apiClient } from '@/lib/api';

import { PostCard } from '@/components';
import { AppLayout } from '@/layouts';

export default async function App() {
  const postQuery = await apiClient.getPosts({});

  const posts = postQuery.data ? postQuery.data.data : [];

  return (
    <AppLayout>
      <main className="flex flex-col justify-center items-center gap-4 w-full max-w-2xl px-4 lg:px-0">
        <div className="w-full grid grid-cols-1 gap-3">
          {posts?.map(({ id, title, content, author, date, lat, lon }, key) => (
            <PostCard
              key={key}
              id={id}
              title={title}
              content={content}
              date={date}
              author={author}
              coordinates={{ lat, lon }}
            />
          ))}
        </div>
      </main>
    </AppLayout>
  );
}
