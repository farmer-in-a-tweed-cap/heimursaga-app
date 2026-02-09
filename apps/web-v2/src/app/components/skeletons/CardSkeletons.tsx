/**
 * Shared skeleton components for loading states
 * These match the structure of their respective card components
 */

// Skeleton count constant - prevents recreation on each render
export const SKELETON_COUNT = [0, 1, 2, 3, 4, 5];

// Shared skeleton building blocks
function SkeletonHeader() {
  return (
    <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 bg-[#616161] dark:bg-[#4a4a4a]" />
        <div className="h-3 w-24 bg-[#616161] dark:bg-[#4a4a4a]" />
      </div>
      <div className="h-3 w-20 bg-[#616161] dark:bg-[#4a4a4a]" />
    </div>
  );
}

function SkeletonActions({ buttonCount = 3 }: { buttonCount?: number }) {
  return (
    <div className="border-t-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 mt-auto">
      <div className="flex items-center justify-center gap-2">
        {buttonCount >= 2 && <div className="flex-1 h-9 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />}
        {buttonCount >= 2 && <div className="flex-1 h-9 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />}
        {buttonCount >= 3 && <div className="w-10 h-9 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />}
      </div>
    </div>
  );
}

function SkeletonStats({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 py-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            <div className="h-3 w-24 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-1" />
            <div className="h-4 w-12 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonText({ lines = 2, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-[#e5e5e5] dark:bg-[#3a3a3a]"
          style={{ width: i === lines - 1 ? '75%' : '100%' }}
        />
      ))}
    </div>
  );
}

/**
 * ExplorerCard skeleton - matches ExplorerCard layout
 */
export function ExplorerCardSkeleton() {
  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col h-full w-full max-w-lg animate-pulse">
      <SkeletonHeader />

      {/* Avatar skeleton */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] px-4 py-6">
        <div className="flex flex-col items-center">
          <div className="w-32 h-32 border-4 border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-4" />
          <div className="h-3 w-32 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
        </div>
      </div>

      {/* Name & bio skeleton */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-4 py-4 bg-white dark:bg-[#202020]">
        <div className="h-5 w-32 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-2" />
        <div className="h-4 w-40 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-3" />
        <SkeletonText lines={2} />
      </div>

      <SkeletonStats rows={4} />
      <SkeletonActions buttonCount={3} />
    </div>
  );
}

/**
 * ExpeditionCard skeleton - matches ExpeditionCard layout
 */
export function ExpeditionCardSkeleton() {
  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col h-full w-full max-w-lg animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-[#616161] dark:bg-[#4a4a4a] rounded-full" />
          <div className="h-3 w-16 bg-[#616161] dark:bg-[#4a4a4a]" />
        </div>
        <div className="h-3 w-24 bg-[#616161] dark:bg-[#4a4a4a]" />
      </div>

      {/* Image skeleton */}
      <div className="h-48 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />

      {/* Title & description skeleton */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-4 py-4 bg-white dark:bg-[#202020]">
        <div className="h-5 w-3/4 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-2" />
        <div className="h-4 w-1/2 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-3" />
        <SkeletonText lines={2} />
      </div>

      <SkeletonStats rows={4} />

      {/* Funding bar skeleton */}
      <div className="px-4 py-3 border-t-2 border-[#202020] dark:border-[#616161]">
        <div className="h-2 w-full bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-2" />
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
          <div className="h-3 w-16 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
        </div>
      </div>

      <SkeletonActions buttonCount={3} />
    </div>
  );
}

/**
 * EntryCard skeleton - matches EntryCard layout
 */
export function EntryCardSkeleton() {
  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020] flex flex-col h-full w-full max-w-lg animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-4 py-2.5">
        <div className="h-3 w-20 bg-[#616161] dark:bg-[#4a4a4a]" />
        <div className="h-3 w-24 bg-[#616161] dark:bg-[#4a4a4a]" />
      </div>

      {/* Title & meta skeleton */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] px-4 py-4 bg-white dark:bg-[#202020]">
        <div className="h-5 w-4/5 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-2" />
        <div className="h-4 w-2/3 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-3" />
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3 w-24 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
          <div className="h-3 w-3 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
          <div className="h-3 w-32 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
        </div>
      </div>

      {/* Excerpt skeleton */}
      <div className="px-4 py-4 bg-white dark:bg-[#202020] flex-1">
        <SkeletonText lines={4} />
      </div>

      {/* Stats skeleton */}
      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] px-4 py-3 border-t-2 border-[#202020] dark:border-[#616161]">
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
          <div className="h-3 w-16 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
          <div className="h-3 w-24 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
        </div>
      </div>

      <SkeletonActions buttonCount={3} />
    </div>
  );
}
