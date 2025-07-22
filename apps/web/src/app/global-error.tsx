'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h2 className="text-2xl font-bold">Something went wrong!</h2>
          <button onClick={reset} className="px-4 py-2 bg-blue-500 text-white rounded">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}