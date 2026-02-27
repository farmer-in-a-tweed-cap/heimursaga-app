'use client';

import Link from 'next/link';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import type { TransformedExpedition, WaypointType, FundingStats } from '@/app/components/expedition-detail/types';
import type { ExpeditionCondition } from '@/app/services/api';

interface SidebarProps {
  expedition: TransformedExpedition;
  isOwner: boolean;
  isAuthenticated: boolean;
  showSponsorshipSection: boolean;
  waypoints: WaypointType[];
  totalRouteDistance: number;
  totalRaised: number;
  totalDuration: number | null;
  fundingStats: FundingStats;
  weatherCondition: ExpeditionCondition | null;
  weatherLocalTime: string;
  formatDistance: (km: number, decimals?: number) => string;
  formatDate: (date: string | undefined) => string;
  onShowUpdateLocationModal: () => void;
  onShowManagementModal: () => void;
  onSponsorUpdate: () => void;
}

function WeatherCard({
  condition,
  localTime,
  formatDistance,
}: {
  condition: ExpeditionCondition;
  localTime: string;
  formatDistance: (km: number, decimals?: number) => string;
}) {
  const { unit } = useDistanceUnit();
  const useMetric = unit === 'km';

  const temp = useMetric ? condition.tempC : condition.tempF;
  const feelsLike = useMetric ? condition.feelsLikeC : condition.feelsLikeF;
  const tempUnit = useMetric ? '°C' : '°F';
  const wind = useMetric ? condition.windKph : condition.windMph;
  const windUnit = useMetric ? 'km/h' : 'mph';
  const iconUrl = condition.conditionIcon.startsWith('//')
    ? `https:${condition.conditionIcon}`
    : condition.conditionIcon;

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
      <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
        CURRENT CONDITIONS
      </h3>
      <div className="text-xs font-mono space-y-2 text-[#616161] dark:text-[#b5bcc4]">
        {/* Condition + Temp header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={iconUrl} alt={condition.condition} className="w-8 h-8" />
            <span className="text-[#202020] dark:text-[#e5e5e5] font-bold">{condition.condition}</span>
          </div>
          <span className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5]">
            {temp.toFixed(1)}{tempUnit}
          </span>
        </div>
        <div>Feels like {feelsLike.toFixed(1)}{tempUnit}</div>

        <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2 space-y-1">
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Wind:</span> {wind.toFixed(0)} {windUnit} {condition.windDir}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Humidity:</span> {condition.humidity}%</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">UV Index:</span> {condition.uvIndex}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Visibility:</span> {formatDistance(condition.visibilityKm, 0)}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Pressure:</span> {condition.pressureMb} mb</div>
        </div>

        <div className="border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2 space-y-1">
          {localTime && (
            <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Local Time:</span> {localTime}</div>
          )}
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Timezone:</span> {condition.timezone}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Updated:</span> {condition.lastUpdated}</div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  expedition,
  isOwner,
  isAuthenticated,
  showSponsorshipSection,
  waypoints,
  totalRouteDistance,
  totalRaised,
  totalDuration,
  fundingStats,
  weatherCondition,
  weatherLocalTime,
  formatDistance,
  formatDate,
  onShowUpdateLocationModal,
  onShowManagementModal,
  onSponsorUpdate,
}: SidebarProps) {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      {isOwner && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
          <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
            QUICK ACTIONS
          </h3>
          <div className="space-y-2">
            <Link
              href={`/log-entry/${expedition.id}`}
              className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
            >
              LOG NEW ENTRY
            </Link>
            <Link
              href={expedition.explorerIsPro ? `/expedition-builder/${expedition.id}` : `/log-entry/${expedition.id}?type=waypoint`}
              className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
            >
              LOG WAYPOINT
            </Link>
            <button
              onClick={onShowUpdateLocationModal}
              disabled={expedition.status === 'completed'}
              className={`w-full py-2 border-2 border-[#202020] dark:border-[#616161] transition-all text-sm font-bold ${
                expedition.status === 'completed'
                  ? 'opacity-50 cursor-not-allowed text-[#616161] dark:text-[#616161]'
                  : 'dark:text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white dark:hover:bg-[#4a4a4a] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]'
              }`}
              title={expedition.status === 'completed' ? 'Cannot update location on completed expeditions' : undefined}
            >
              UPDATE LOCATION
            </button>
{showSponsorshipSection && (
              <button
                onClick={onSponsorUpdate}
                className="w-full py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm font-bold"
              >
                SPONSOR UPDATE
              </button>
            )}
            <button
              onClick={onShowManagementModal}
              className="w-full py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm font-bold flex items-center justify-center gap-2"
            >
              MANAGE EXPEDITION
            </button>
          </div>
        </div>
      )}

      {/* Expedition Details */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
        <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
          EXPEDITION DETAILS
        </h3>
        <div className="text-xs font-mono space-y-2 text-[#616161] dark:text-[#b5bcc4]">
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">ID:</span> {expedition.id}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Status:</span> {expedition.status}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Category:</span> {expedition.category || 'Not set'}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Region:</span> {expedition.region || 'Not set'}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Started:</span> {formatDate(expedition.startDate)}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Est. End:</span> {formatDate(expedition.estimatedEndDate)}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Duration:</span> {expedition.daysActive} / {totalDuration || '?'} days</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Privacy:</span> {expedition.privacy === 'off-grid' ? 'Off-Grid' : expedition.privacy === 'private' ? 'Private' : 'Public'}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Comments:</span> {expedition.commentsEnabled ? 'Enabled' : 'Disabled'}</div>
        </div>
      </div>

      {/* Current Weather Conditions — active expeditions with weather data */}
      {weatherCondition && (
        <WeatherCard
          condition={weatherCondition}
          localTime={weatherLocalTime}
          formatDistance={formatDistance}
        />
      )}

      {/* Funding Breakdown - only show if sponsorships enabled */}
      {showSponsorshipSection && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
          <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
            SPONSORSHIP FUNDING BREAKDOWN
          </h3>

          {/* Goal & Progress */}
          <div className="mb-4">
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Goal:</span>
                <span className="font-bold text-sm dark:text-[#e5e5e5]">${expedition.goal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Raised:</span>
                <span className="font-bold text-sm text-[#ac6d46]">${totalRaised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Remaining:</span>
                <span className="font-bold text-sm dark:text-[#e5e5e5]">${Math.max(0, expedition.goal - totalRaised).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-[#616161] dark:text-[#b5bcc4]">PROGRESS</span>
                <span className="font-bold text-[#ac6d46]">{Math.min(100, (expedition.goal > 0 ? (totalRaised / expedition.goal) * 100 : 0)).toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-[#b5bcc4] dark:bg-[#3a3a3a] border-2 border-[#202020] dark:border-[#616161]">
                <div
                  className="h-full bg-[#ac6d46]"
                  style={{ width: `${Math.min(100, expedition.goal > 0 ? (totalRaised / expedition.goal) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Excess Funding Notice */}
          {expedition.goal > 0 && totalRaised > expedition.goal && (
            <div className="mb-4 p-3 bg-[#fef9e7] dark:bg-[#2a2518] border-l-4 border-[#d4a844]">
              <div className="text-xs font-bold mb-1 text-[#d4a844]">
                {totalRaised > expedition.goal && fundingStats.totalRecurringToDate > 0 && expedition.raised <= expedition.goal
                  ? 'PROJECTED TO EXCEED GOAL'
                  : 'GOAL EXCEEDED'}
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                Excess of <span className="font-bold">${(totalRaised - expedition.goal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {totalRaised > expedition.goal && fundingStats.totalRecurringToDate > 0 && expedition.raised <= expedition.goal
                  ? ' is projected by end of expedition from recurring sponsorships. '
                  : '. '}
                Excess funds will be allocated to future expeditions.
              </div>
            </div>
          )}

          {/* Funding Sources Breakdown */}
          <div className="mb-4 p-3 bg-[#fff5f0] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46]">
            <div className="text-xs font-bold mb-2 text-[#ac6d46]">ONE-TIME SPONSORSHIPS</div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">{expedition.sponsors} sponsor{expedition.sponsors !== 1 ? 's' : ''}</span>
              <span className="font-bold text-sm text-[#ac6d46]">${expedition.raised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mb-4 p-3 bg-[#f0f4f8] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac]">
            <div className="text-xs font-bold mb-2 text-[#4676ac]">RECURRING MONTHLY</div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">{fundingStats.activeSubscribers} active sponsor{fundingStats.activeSubscribers !== 1 ? 's' : ''}</span>
                <span className="font-bold text-sm text-[#4676ac]">${fundingStats.monthlyRecurring.toFixed(2)}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Committed to date:</span>
                <span className="font-bold text-sm text-[#4676ac]">${fundingStats.totalRecurringToDate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Sponsor Button */}
          {!isOwner && expedition.status !== 'completed' && expedition.status !== 'cancelled' && (
            <Link
              href={isAuthenticated ? `/sponsor/${expedition.id}` : `/login?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
              className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
            >
              SPONSOR
            </Link>
          )}
        </div>
      )}

      {/* Tags */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
        <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
          TAGS
        </h3>
        <div className="flex flex-wrap gap-2">
          {expedition.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] text-xs">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Route Statistics */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
        <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
          ROUTE STATISTICS
        </h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-[#616161] dark:text-[#b5bcc4]">Total Waypoints</span>
            <span className="font-bold dark:text-[#e5e5e5]">{expedition.totalWaypoints}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#616161] dark:text-[#b5bcc4]">Completed</span>
            <span className="font-bold text-[#ac6d46]">{waypoints.filter(w => w.status === 'completed').length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#616161] dark:text-[#b5bcc4]">Current</span>
            <span className="font-bold text-[#4676ac]">{waypoints.filter(w => w.status === 'current').length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#616161] dark:text-[#b5bcc4]">Planned</span>
            <span className="font-bold dark:text-[#e5e5e5]">{waypoints.filter(w => w.status === 'planned').length}</span>
          </div>
          <div className="flex justify-between border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
            <span className="text-[#616161] dark:text-[#b5bcc4]">Estimated Distance</span>
            <span className="font-bold dark:text-[#e5e5e5]">~{formatDistance(totalRouteDistance, 0)}</span>
          </div>
          {expedition.daysActive > 0 && (
            <div className="flex justify-between">
              <span className="text-[#616161] dark:text-[#b5bcc4]">Avg. Daily Distance</span>
              <span className="font-bold dark:text-[#e5e5e5]">~{formatDistance(totalRouteDistance / expedition.daysActive, 1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
