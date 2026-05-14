'use client';

/**
 * Reference cards used by /cards-preview to demonstrate the
 * historical-archive aesthetic — the visual language we're considering
 * migrating the rest of the card library to. These are stripped-down
 * read-only previews; no behavior beyond display.
 *
 * Key visual moves on these reference cards:
 *  - 2px hard border that flips to copper (#ac6d46) on hover
 *  - font-serif title (vs the sans-serif font-bold currently used)
 *  - text-[10px] mono uppercase metadata in copper (#ac6d46)
 *  - text-xs serif description, line-clamp
 *  - Compact 2-column footer: count on left, region on right, separated by border-top
 *  - 16:10 image aspect (vs 16:9 / 4:3 elsewhere)
 *  - No action buttons — hover-state surface, the whole card is the link
 */

interface ReferenceExpeditionProps {
  title: string;
  explorer: string;
  years: string;
  description: string;
  imageUrl?: string;
  entriesCount: number;
  region?: string;
}

export function ReferenceExpeditionCard({
  title,
  explorer,
  years,
  description,
  imageUrl,
  entriesCount,
  region,
}: ReferenceExpeditionProps) {
  return (
    <div className="group block bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors cursor-pointer">
      <div className="relative aspect-[16/10] bg-[#e8e8e8] dark:bg-[#2a2a2a] overflow-hidden">
        {imageUrl ? (
          // Plain img — preview page only, doesn't need next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[#616161] font-mono">
            NO COVER
          </div>
        )}
        <div className="absolute top-0 left-0 bg-[#202020]/85 text-white px-3 py-1 text-[10px] font-mono font-bold tracking-wider">
          {years || 'HISTORICAL'}
        </div>
      </div>
      <div className="p-4 border-t-2 border-[#202020] dark:border-[#616161]">
        <div className="text-[10px] font-mono font-bold text-[#ac6d46] tracking-wider mb-1">
          {explorer.toUpperCase()}
        </div>
        <h3 className="text-base font-serif font-bold leading-tight text-[#202020] dark:text-[#e5e5e5] mb-2 group-hover:text-[#ac6d46]">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-serif leading-relaxed line-clamp-3">
            {description}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] flex items-center justify-between text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4]">
          <span>
            {entriesCount} {entriesCount === 1 ? 'ENTRY' : 'ENTRIES'}
          </span>
          {region && <span className="uppercase">{region}</span>}
        </div>
      </div>
    </div>
  );
}

interface ReferenceEntryProps {
  title: string;
  explorer: string;
  date: string;
  place?: string;
  excerpt?: string;
}

export function ReferenceEntryCard({
  title,
  explorer,
  date,
  place,
  excerpt,
}: ReferenceEntryProps) {
  return (
    <div className="group block bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors cursor-pointer p-4 md:p-5">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4] tracking-wider shrink-0">
          {date.toUpperCase()}
        </span>
        <span className="text-[10px] font-mono font-bold text-[#ac6d46] tracking-wider truncate">
          · {explorer.toUpperCase()}
        </span>
      </div>
      <h4 className="font-serif font-bold text-base text-[#202020] dark:text-[#e5e5e5] group-hover:text-[#ac6d46] leading-snug mb-1">
        {title}
      </h4>
      {place && (
        <div className="text-[11px] text-[#616161] dark:text-[#b5bcc4] font-mono mb-2 truncate">
          {place}
        </div>
      )}
      {excerpt && (
        <p className="text-sm text-[#616161] dark:text-[#b5bcc4] font-serif leading-relaxed line-clamp-3">
          {excerpt}
        </p>
      )}
    </div>
  );
}

interface ReferenceExplorerProps {
  name: string;
  lifespan?: string;
  knownFor: string;
  expeditions: number;
  entries: number;
}

export function ReferenceExplorerCard({
  name,
  lifespan,
  knownFor,
  expeditions,
  entries,
}: ReferenceExplorerProps) {
  return (
    <div className="group block bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-colors cursor-pointer">
      <div className="p-4 md:p-5">
        {lifespan && (
          <div className="text-[10px] font-mono text-[#ac6d46] tracking-wider mb-1">
            {lifespan}
          </div>
        )}
        <h3 className="text-base md:text-lg font-serif font-bold text-[#202020] dark:text-[#e5e5e5] group-hover:text-[#ac6d46] leading-snug mb-2">
          {name}
        </h3>
        <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-serif leading-relaxed line-clamp-2">
          {knownFor}
        </p>
        <div className="mt-3 pt-3 border-t border-[#b5bcc4] dark:border-[#3a3a3a] flex items-center justify-between text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4]">
          <span>
            {expeditions} {expeditions === 1 ? 'EXPEDITION' : 'EXPEDITIONS'}
          </span>
          <span>
            {entries} {entries === 1 ? 'ENTRY' : 'ENTRIES'}
          </span>
        </div>
      </div>
    </div>
  );
}
