/**
 * Page-level skeleton loaders for critical pages.
 * Layouts match the actual rendered structure of each page.
 */

import { ExpeditionCardSkeleton, ExplorerCardSkeleton, EntryCardSkeleton } from './CardSkeletons';

/** Reusable section wrapper matching the bordered card sections used on HomePage */
function SectionSkeleton({ titleWidth, children }: { titleWidth: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
      {/* Section header: title + VIEW ALL → */}
      <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        <div className={`h-3.5 ${titleWidth} bg-[#e5e5e5] dark:bg-[#3a3a3a]`} />
        <div className="h-3 w-16 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
      </div>
      {children}
    </div>
  );
}

/**
 * HomePage skeleton — matches RegionReport + Map + 3 featured sections
 */
export function HomePageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* RegionReport skeleton */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
        <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
          <div className="h-3.5 w-32 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="text-center">
              <div className="h-6 w-12 bg-[#e5e5e5] dark:bg-[#3a3a3a] mx-auto mb-1" />
              <div className="h-3 w-20 bg-[#e5e5e5] dark:bg-[#3a3a3a] mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Map skeleton */}
      <div className="mt-6 mb-8">
        <div className="h-[300px] md:h-[400px] bg-[#e5e5e5] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161]" />
      </div>

      {/* Featured Expeditions */}
      <SectionSkeleton titleWidth="w-44">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {[0, 1, 2].map(i => <ExpeditionCardSkeleton key={i} />)}
        </div>
      </SectionSkeleton>

      {/* Featured Explorers */}
      <SectionSkeleton titleWidth="w-40">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {[0, 1, 2].map(i => <ExplorerCardSkeleton key={i} />)}
        </div>
      </SectionSkeleton>

      {/* Recent Journal Entries */}
      <SectionSkeleton titleWidth="w-48">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {[0, 1, 2, 3, 4, 5].map(i => <EntryCardSkeleton key={i} />)}
        </div>
      </SectionSkeleton>
    </div>
  );
}

/**
 * ExplorerProfile skeleton — matches cover photo with overlapping avatar,
 * stats bar, action buttons, and 2+1 column content grid
 */
export function ExplorerProfileSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto px-3 py-4 md:px-6 md:py-12 animate-pulse">
      {/* Cover photo with overlapping avatar + name */}
      <div className="relative h-[280px] md:h-[400px] overflow-hidden bg-[#e5e5e5] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161]">
        {/* Gradient overlay matching real page */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#202020]/70 via-[#202020]/60 to-[#202020]/90" />

        {/* Status banner at top */}
        <div className="absolute top-0 left-0 right-0 py-2 px-6 bg-[#616161]/60 z-10">
          <div className="h-3 w-24 bg-white/20" />
        </div>

        {/* Content overlay: avatar + name + bio */}
        <div className="absolute inset-0 flex flex-col p-4 pt-14 md:p-6 md:pt-16 z-[2]">
          <div className="flex items-start gap-3 md:gap-6 w-full">
            {/* Avatar */}
            <div className="flex-shrink-0 mt-2 flex flex-col items-center">
              <div className="w-20 h-20 md:w-40 md:h-40 border-2 md:border-4 border-[#616161] bg-[#3a3a3a]/60" />
              <div className="mt-1.5 md:mt-2 px-3 py-1 bg-[#616161]/40 w-16 h-5" />
            </div>

            {/* Name + journal name + bio */}
            <div className="flex-1 pt-0 md:pt-2 min-w-0">
              <div className="h-5 md:h-8 w-48 bg-white/20 mb-2" />
              <div className="h-4 md:h-5 w-36 bg-[#ac6d46]/30 mb-2 md:mb-3" />
              <div className="space-y-0.5 md:space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-white/15" />
                  <div className="h-3 w-32 bg-white/15" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-white/15" />
                  <div className="h-3 w-40 bg-white/15" />
                </div>
                <div className="hidden md:flex items-center gap-2">
                  <div className="h-3 w-3 bg-white/15" />
                  <div className="h-3 w-28 bg-white/15" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-5 border-t-2 border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020]">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`p-2 md:p-4 border-r border-b md:border-b-0 border-[#b5bcc4] dark:border-[#3a3a3a] flex flex-col items-center justify-center ${i >= 3 ? 'hidden md:flex' : ''}`}
          >
            <div className="h-5 md:h-7 w-8 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-1" />
            <div className="h-3 w-14 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="p-3 md:p-4 flex gap-1.5 md:gap-3 flex-nowrap overflow-x-auto items-center bg-white dark:bg-[#202020] border-b-2 border-x-2 border-[#202020] dark:border-[#616161]">
        <div className="h-9 md:h-11 w-24 bg-[#4676ac]/30 flex-shrink-0" />
        <div className="h-9 md:h-11 w-20 bg-[#e5e5e5] dark:bg-[#3a3a3a] flex-shrink-0" />
        <div className="h-9 md:h-11 w-20 bg-[#e5e5e5] dark:bg-[#3a3a3a] flex-shrink-0" />
        <div className="h-9 md:h-11 w-28 bg-[#ac6d46]/30 flex-shrink-0" />
      </div>

      {/* Map placeholder */}
      <div className="mt-4 md:mt-6 mb-4 md:mb-6">
        <div className="h-[250px] md:h-[350px] bg-[#e5e5e5] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161]" />
      </div>

      {/* Main content: 2-column (left) + 1-column (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left column: Expeditions + Entries */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Expeditions section */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6">
            <div className="text-xs md:text-sm font-bold mb-3 md:mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
              <div className="h-3.5 w-40 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {[0, 1].map(i => <ExpeditionCardSkeleton key={i} />)}
            </div>
          </div>

          {/* Entries section */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6">
            <div className="text-xs md:text-sm font-bold mb-3 md:mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
              <div className="h-3.5 w-44 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {[0, 1].map(i => <EntryCardSkeleton key={i} />)}
            </div>
          </div>
        </div>

        {/* Right column: Bio + Links */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          {/* Bio box */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6">
            <div className="h-3.5 w-12 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-3 border-b-2 border-[#202020] dark:border-[#616161] pb-2" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
              <div className="h-3 w-full bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
              <div className="h-3 w-3/4 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            </div>
          </div>

          {/* Links & Social box */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 md:p-6">
            <div className="h-3.5 w-28 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-3" />
            <div className="space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
                  <div className="h-3 w-32 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ExpeditionDetail skeleton — matches HeroBanner (400/600px) with gradient,
 * stats grid, and 2+1 column content with sidebar
 */
export function ExpeditionDetailSkeleton() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12 animate-pulse">
      {/* HeroBanner wrapper */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        {/* Banner with map/image placeholder */}
        <div className="relative h-[400px] md:h-[600px] overflow-hidden bg-[#e5e5e5] dark:bg-[#3a3a3a]">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#202020]/70 via-[#202020]/60 to-[#202020]/90" />

          {/* Status banner at top */}
          <div className="absolute top-0 left-0 right-0 py-2 px-6 bg-[#ac6d46]/60 z-10">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-white/30 rounded-full" />
              <div className="h-3 w-20 bg-white/20" />
            </div>
          </div>

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-6 pt-16 z-[2]">
            {/* Top: title + meta */}
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                {/* Title */}
                <div className="h-7 md:h-10 w-80 max-w-full bg-white/20 mb-3" />
                {/* Location */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 bg-white/15" />
                  <div className="h-3.5 w-40 bg-white/15" />
                </div>
                {/* Region + category badges */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-20 bg-white/10" />
                  <div className="h-5 w-24 bg-white/10" />
                </div>
                {/* Dates */}
                <div className="h-3 w-56 bg-white/15 mb-3" />
                {/* Description */}
                <div className="space-y-1.5 max-w-lg">
                  <div className="h-3 w-full bg-white/10" />
                  <div className="h-3 w-3/4 bg-white/10" />
                </div>
              </div>

              {/* Explorer card (desktop only) */}
              <div className="hidden md:block bg-[#202020]/80 border-2 border-[#ac6d46]/40 p-4 min-w-[280px]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#616161]/40" />
                  <div>
                    <div className="h-3.5 w-24 bg-white/20 mb-1" />
                    <div className="h-3 w-16 bg-white/15" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-white/10" />
                  <div className="h-3 w-2/3 bg-white/10" />
                </div>
              </div>
            </div>

            {/* Bottom: action bar */}
            <div className="-mx-6 -mb-6 bg-[#202020]/90 px-3 md:px-6 py-2 md:py-3 border-t-2 border-[#616161]">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="h-8 w-24 bg-[#ac6d46]/30" />
                <div className="h-8 w-8 bg-white/10" />
                <div className="h-8 w-8 bg-white/10" />
                <div className="h-8 w-8 bg-white/10" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 border-t-2 border-[#202020] dark:border-[#616161]">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={`p-2 md:p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center ${i >= 2 ? 'hidden md:flex' : ''}`}
            >
              <div className="h-5 md:h-6 w-10 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-1" />
              <div className="h-3 w-14 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            </div>
          ))}
        </div>

        {/* Mobile explorer info */}
        <div className="md:hidden border-t-2 border-[#202020] dark:border-[#616161] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            <div>
              <div className="h-4 w-24 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-1" />
              <div className="h-3 w-16 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content: 2-column (tabs) + 1-column (sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: ContentTabs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
            {/* Tab navigation */}
            <div className="border-b-2 border-[#202020] dark:border-[#616161] flex">
              <div className="flex-1 py-3 bg-[#4676ac]/60 text-center">
                <div className="h-3.5 w-24 bg-white/30 mx-auto" />
              </div>
              <div className="flex-1 py-3 bg-[#616161]/40 text-center">
                <div className="h-3.5 w-20 bg-white/20 mx-auto" />
              </div>
              <div className="flex-1 py-3 bg-[#616161]/40 text-center">
                <div className="h-3.5 w-16 bg-white/20 mx-auto" />
              </div>
            </div>

            {/* Tab content: entry list */}
            <div className="p-6 space-y-4">
              {[0, 1, 2].map(i => (
                <div key={i} className="border-2 border-[#202020] dark:border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="h-5 w-3/4 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-2" />
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-24 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
                        <div className="h-3 w-3 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
                        <div className="h-3 w-28 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
                      </div>
                      <div className="h-3 w-full bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-1" />
                      <div className="h-3 w-2/3 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
                    </div>
                    <div className="w-20 h-20 bg-[#e5e5e5] dark:bg-[#3a3a3a] flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Sponsorship / funding box */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <div className="h-4 w-32 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-4" />
            {/* Progress bar */}
            <div className="h-3 bg-[#b5bcc4] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161] mb-2">
              <div className="h-full w-1/3 bg-[#ac6d46]/40" />
            </div>
            <div className="flex justify-between mb-4">
              <div className="h-3 w-20 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
              <div className="h-3 w-16 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            </div>
            {/* One-time row */}
            <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] mb-2">
              <div className="h-3 w-24 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-1" />
              <div className="h-4 w-16 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            </div>
            {/* Recurring row */}
            <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] mb-4">
              <div className="h-3 w-28 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-1" />
              <div className="h-4 w-16 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
            </div>
            {/* Sponsor button */}
            <div className="h-10 w-full bg-[#ac6d46]/30" />
          </div>

          {/* Expedition details box */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <div className="h-4 w-36 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-4" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="h-3 w-20 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
                  <div className="h-3 w-24 bg-[#e5e5e5] dark:bg-[#3a3a3a]" />
                </div>
              ))}
            </div>
          </div>

          {/* Tags box */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <div className="h-4 w-12 bg-[#e5e5e5] dark:bg-[#3a3a3a] mb-3" />
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-6 w-16 bg-[#b5bcc4] dark:bg-[#3a3a3a]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
