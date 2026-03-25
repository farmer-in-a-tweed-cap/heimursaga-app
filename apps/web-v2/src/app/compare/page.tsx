import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Compare Platforms',
  description:
    'See how Heimursaga compares to Patreon, Substack, and other creator platforms for expedition creators.',
  openGraph: {
    title: 'Compare Platforms | Heimursaga',
    description:
      'See how Heimursaga compares to Patreon, Substack, and other creator platforms for expedition creators.',
    url: 'https://heimursaga.com/compare',
  },
};

export default function Page() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
      <div className="bg-[#202020] text-white border-2 border-[#616161] mb-8">
        <div className="bg-[#ac6d46] p-6 sm:p-8 border-b-2 border-[#616161]">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">COMPARE PLATFORMS</h1>
          <p className="text-sm sm:text-base text-[#f5f5f5]">
            Honest side-by-side comparisons for expedition creators
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Link
          href="/compare/patreon"
          className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 hover:border-[#ac6d46] transition-colors group"
        >
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2 group-hover:text-[#ac6d46] transition-colors">
            PATREON vs HEIMURSAGA
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            General-purpose creator platform vs purpose-built expedition tools. Same fees, different experience.
          </p>
        </Link>

        <Link
          href="/compare/substack"
          className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 hover:border-[#ac6d46] transition-colors group"
        >
          <h2 className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-2 group-hover:text-[#ac6d46] transition-colors">
            SUBSTACK vs HEIMURSAGA
          </h2>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            Newsletter-first platform vs expedition storytelling. Both let you write and get paid — the tools around that writing are very different.
          </p>
        </Link>
      </div>
    </div>
  );
}
