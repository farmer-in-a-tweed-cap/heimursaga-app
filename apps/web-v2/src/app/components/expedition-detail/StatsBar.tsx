import type { TransformedExpedition } from '@/app/components/expedition-detail/types';
import type { Expedition } from '@/app/services/api';

interface StatsBarProps {
  expedition: TransformedExpedition;
  showSponsorshipSection: boolean;
  totalRaised: number;
  totalRouteDistance: number;
  now: number;
  apiExpedition: Expedition | null;
  formatDistance: (distance: number, decimals?: number) => string;
}

export function StatsBar({
  expedition,
  showSponsorshipSection,
  totalRaised,
  totalRouteDistance,
  now,
  apiExpedition,
  formatDistance,
}: StatsBarProps) {
  return (
    <div className={`grid grid-cols-2 ${showSponsorshipSection ? 'md:grid-cols-6' : 'md:grid-cols-4'} border-t-2 border-[#202020] dark:border-[#616161]`}>
      {/* Days to Start (planned) or Days Active (active/completed) */}
      <div className="p-2 md:p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
        {expedition.status === 'planned' && expedition.startDate ? (() => {
          const daysUntilStart = Math.max(0, Math.ceil((new Date(expedition.startDate).getTime() - now) / (1000 * 60 * 60 * 24)));
          return (
            <>
              <div className="text-xl md:text-2xl font-medium text-[#4676ac]">{daysUntilStart}</div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Days to Start</div>
            </>
          );
        })() : (
          <>
            <div className="text-xl md:text-2xl font-medium dark:text-[#e5e5e5]">{expedition.daysActive}</div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Days Active</div>
          </>
        )}
      </div>
      {/* Raised - only show if sponsorships enabled */}
      {showSponsorshipSection && (
        <div className="p-2 md:p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
          <div className="text-xl md:text-2xl font-medium dark:text-[#e5e5e5]">
            ${totalRaised >= 1000 ? `${(totalRaised / 1000).toFixed(1)}k` : totalRaised.toFixed(0)}
          </div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            {expedition.goal > 0 ? `of $${expedition.goal >= 1000 ? `${(expedition.goal / 1000).toFixed(1)}k` : expedition.goal.toLocaleString()} goal` : 'Raised'}
          </div>
        </div>
      )}
      {/* Sponsors - only show if sponsorships enabled */}
      {showSponsorshipSection && (
        <div className="p-2 md:p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
          <div className="text-xl md:text-2xl font-medium text-[#ac6d46]">{expedition.sponsors}</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Sponsors</div>
        </div>
      )}
      <div className="p-2 md:p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
        <div className="text-xl md:text-2xl font-medium text-[#4676ac]">{expedition.totalWaypoints}</div>
        <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Waypoints</div>
      </div>
      <div className="p-2 md:p-4 border-r-2 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
        <div className="text-xl md:text-2xl font-medium text-[#ac6d46]">{expedition.totalEntries}</div>
        <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">Entries</div>
      </div>
      <div className="p-2 md:p-4 border-b-2 md:border-b-0 border-[#202020] dark:border-[#616161] flex flex-col items-center justify-center">
        <div className="text-xl md:text-2xl font-medium text-[#4676ac]">{formatDistance(totalRouteDistance, 1)}</div>
        <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
          {(() => {
            const mode = apiExpedition?.routeMode;
            const modeLabels: Record<string, string> = {
              walking: 'Walking', cycling: 'Cycling', driving: 'Driving',
              trail: 'Trail', waterway: 'Waterway', mixed: 'Mixed', straight: 'Straight Line',
            };
            const modeLabel = modeLabels[mode || ''] || 'Haversine';
            const tripLabel = apiExpedition?.isRoundTrip ? 'Round Trip' : 'One Way';
            return `${modeLabel} \u2022 ${tripLabel}`;
          })()}
        </div>
      </div>
    </div>
  );
}
