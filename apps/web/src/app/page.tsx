import { AppLayout } from '@/components';

const { API_HOST } = process.env;

export default async function App() {
  const results = await fetch(`${API_HOST}/test`)
    .then((response) => response.json())
    .catch((e) => null);

  return (
    <AppLayout>
      <main className="flex flex-col justify-center items-center gap-4 w-full max-w-l">
        {JSON.stringify({ results })}
      </main>
    </AppLayout>
  );
}
