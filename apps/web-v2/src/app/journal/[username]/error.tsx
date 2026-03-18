'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-12 text-center">
      <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-4">Something went wrong</h2>
      <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-[#ac6d46] text-white text-sm font-bold tracking-[0.14em] hover:bg-[#8a5738] transition-all"
      >
        TRY AGAIN
      </button>
    </div>
  );
}
