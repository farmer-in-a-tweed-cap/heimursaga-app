'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { formatCurrency } from '@/app/utils/formatCurrency';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { ExplorerAvatar } from '@/app/components/ExplorerAvatar';
import { useState, useEffect } from 'react';
import { Anchor } from 'lucide-react';
import type { TransformedExpedition, WaypointType, FundingStats, SponsorWithTotal } from '@/app/components/expedition-detail/types';
import type { ExpeditionCondition, BlueprintReview, MarineConditions } from '@/app/services/api';
import { weatherApi } from '@/app/services/api';
import { getPerksForSlot, getTierLabel } from '@repo/types/sponsorship-tiers';
import type { SponsorshipTierFull } from '@/app/services/api';

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
  sponsors: SponsorWithTotal[];
  onSponsorUpdate: () => void;
  monthlyTiers: SponsorshipTierFull[];
  isRouteLocked?: boolean;
  isBlueprint?: boolean;
  reviews?: BlueprintReview[];
  averageRating?: number;
  ratingsCount?: number;
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
  const useMetric = unit === 'km' || unit === 'nm'; // nautical uses Celsius

  const temp = useMetric ? condition.tempC : condition.tempF;
  const feelsLike = useMetric ? condition.feelsLikeC : condition.feelsLikeF;
  const tempUnit = useMetric ? '°C' : '°F';
  const wind = unit === 'nm' ? condition.windKph * 0.539957 : unit === 'km' ? condition.windKph : condition.windMph;
  const windUnit = unit === 'nm' ? 'kn' : unit === 'km' ? 'km/h' : 'mph';
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

function VesselCard({ expedition }: { expedition: TransformedExpedition }) {
  const { unit } = useDistanceUnit();
  const formatLength = (m: number) => {
    if (unit === 'mi') return `${(m * 3.28084).toFixed(1)} ft`;
    return `${m.toFixed(1)} m`;
  };
  const typeLabel: Record<string, string> = {
    monohull: 'Monohull',
    catamaran: 'Catamaran',
    trimaran: 'Trimaran',
    other: 'Other',
  };

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
      <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5] flex items-center gap-2">
        <Anchor size={14} />
        VESSEL
      </h3>
      <div className="text-xs font-mono space-y-1 text-[#616161] dark:text-[#b5bcc4]">
        <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">{expedition.vesselName}</div>
        {expedition.vesselType && (
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Type:</span> {typeLabel[expedition.vesselType] || expedition.vesselType}</div>
        )}
        {expedition.vesselLengthM != null && (
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">LOA:</span> {formatLength(expedition.vesselLengthM)}</div>
        )}
        {expedition.vesselDraftM != null && (
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Draft:</span> {formatLength(expedition.vesselDraftM)}</div>
        )}
        {expedition.vesselCrewSize != null && (
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Crew:</span> {expedition.vesselCrewSize}</div>
        )}
      </div>
    </div>
  );
}

function MarineWeatherCard({ lat, lon }: { lat: number; lon: number }) {
  const [marine, setMarine] = useState<MarineConditions | null>(null);
  const { unit } = useDistanceUnit();

  useEffect(() => {
    weatherApi.getMarineConditions(lat, lon).then(setMarine).catch(() => {});
  }, [lat, lon]);

  if (!marine) return null;

  const formatDir = (deg: number) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  };
  const speedLabel = unit === 'nm' ? 'kn' : unit === 'km' ? 'km/h' : 'mph';
  const currentSpeed = unit === 'nm'
    ? (marine.oceanCurrentVelocity * 1.94384).toFixed(1) // m/s to knots
    : unit === 'km'
      ? (marine.oceanCurrentVelocity * 3.6).toFixed(1)
      : (marine.oceanCurrentVelocity * 2.23694).toFixed(1);

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
      <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
        MARINE CONDITIONS
      </h3>
      <div className="text-xs font-mono space-y-1 text-[#616161] dark:text-[#b5bcc4]">
        {marine.waveHeight > 0 && (
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Waves:</span> {marine.waveHeight.toFixed(1)} m / {marine.wavePeriod.toFixed(0)}s {formatDir(marine.waveDirection)}</div>
        )}
        {marine.swellHeight > 0 && (
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Swell:</span> {marine.swellHeight.toFixed(1)} m / {marine.swellPeriod.toFixed(0)}s {formatDir(marine.swellDirection)}</div>
        )}
        {marine.oceanCurrentVelocity > 0 && (
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Current:</span> {currentSpeed} {speedLabel} {formatDir(marine.oceanCurrentDirection)}</div>
        )}
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
  sponsors,
  onSponsorUpdate,
  monthlyTiers,
  isRouteLocked,
  isBlueprint,
  reviews = [],
  averageRating,
  ratingsCount,
}: SidebarProps) {
  const oneTimeSponsorsCount = new Set(
    sponsors.filter(s => s.type?.toLowerCase() !== 'subscription').map(s => s.user?.username)
  ).size;

  return (
    <div className="space-y-6">
      {/* Quick Actions — hidden for blueprints (edit button is in the action bar) */}
      {isOwner && !isBlueprint && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
          <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
            QUICK ACTIONS
          </h3>
          <div className="space-y-2">
            {expedition.status === 'cancelled' ? (
              <div className="py-2 bg-[#994040]/10 border-2 border-[#994040] text-center text-xs font-bold text-[#994040]">
                EXPEDITION CANCELLED — ENTRIES LOCKED
              </div>
            ) : (
              <>
                <Link
                  href={`/log-entry/${expedition.id}`}
                  className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
                >
                  LOG NEW ENTRY
                </Link>
                {expedition.explorerIsPro && !isRouteLocked && (
                  <Link
                    href={`/expedition-builder/${expedition.id}`}
                    className="block w-full py-2 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold"
                  >
                    LOG WAYPOINT
                  </Link>
                )}
              </>
            )}
            <button
              onClick={onShowUpdateLocationModal}
              disabled={expedition.status === 'completed' || expedition.status === 'cancelled'}
              className={`w-full py-2 border-2 border-[#202020] dark:border-[#616161] transition-all text-sm font-bold ${
                expedition.status === 'completed' || expedition.status === 'cancelled'
                  ? 'opacity-50 cursor-not-allowed text-[#616161] dark:text-[#616161]'
                  : 'dark:text-[#e5e5e5] hover:bg-[#4a4a4a] hover:text-white dark:hover:bg-[#4a4a4a] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161]'
              }`}
              title={expedition.status === 'completed' ? 'Cannot update location on completed expeditions' : expedition.status === 'cancelled' ? 'Cannot update location on cancelled expeditions' : undefined}
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
          {expedition.locationName && (
            <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Location:</span> {expedition.locationName}</div>
          )}
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Started:</span> {formatDate(expedition.startDate)}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Est. End:</span> {formatDate(expedition.estimatedEndDate)}</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Duration:</span> {expedition.daysActive} / {totalDuration || '?'} days</div>
          <div><span className="text-[#202020] dark:text-[#e5e5e5] font-bold">Privacy:</span> {expedition.privacy === 'off-grid' ? 'Off-Grid' : expedition.privacy === 'private' ? 'Private' : 'Public'}</div>
        </div>
      </div>

      {/* Vessel Details */}
      {expedition.vesselName && (
        <VesselCard expedition={expedition} />
      )}

      {/* Current Weather Conditions — active expeditions with weather data */}
      {weatherCondition && (
        <WeatherCard
          condition={weatherCondition}
          localTime={weatherLocalTime}
          formatDistance={formatDistance}
        />
      )}

      {/* Marine Conditions — for sail/paddle expeditions */}
      {(expedition.mode === 'sail' || expedition.mode === 'paddle') && weatherCondition && (
        <MarineWeatherCard lat={weatherCondition.lat} lon={weatherCondition.lon} />
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
          <div className="mb-4 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46]">
            <div className="text-xs font-bold mb-2 text-[#ac6d46]">ONE-TIME SPONSORSHIPS</div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">{oneTimeSponsorsCount} sponsor{oneTimeSponsorsCount !== 1 ? 's' : ''}</span>
              <span className="font-bold text-sm text-[#ac6d46]">${expedition.raised.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="mb-4 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac]">
            <div className="text-xs font-bold mb-2 text-[#4676ac]">RECURRING MONTHLY</div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">{fundingStats.activeSubscribers} active sponsor{fundingStats.activeSubscribers !== 1 ? 's' : ''}</span>
                <span className="font-bold text-sm text-[#4676ac]">${formatCurrency(fundingStats.monthlyRecurring)}/mo</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">Committed to date:</span>
                <span className="font-bold text-sm text-[#4676ac]">${formatCurrency(fundingStats.totalRecurringToDate)}</span>
              </div>
            </div>
          </div>

          {/* Sponsor Tiers & Perks */}
          {monthlyTiers.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-bold mb-2 text-[#202020] dark:text-[#e5e5e5] border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-3">
              MONTHLY TIERS
            </div>
            {monthlyTiers
              .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
              .map(tier => {
                const slot = tier.priority ?? 1;
                const label = getTierLabel('MONTHLY', slot);
                const perks = getPerksForSlot('MONTHLY', slot);
                return (
                  <div key={tier.id} className="mb-2 text-xs">
                    <div className="font-bold text-[#4676ac]">
                      {label} <span className="font-normal text-[#616161] dark:text-[#b5bcc4]">${formatCurrency(tier.price)}/mo</span>
                    </div>
                    <div className="ml-2 mt-0.5 space-y-0.5">
                      {perks.map((perk, i) => (
                        <div key={i} className="text-[10px] text-[#616161] dark:text-[#b5bcc4] flex items-start gap-1">
                          <span className="text-[#598636]">*</span> {perk}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
          )}

          {/* Sponsor Button */}
          {!isOwner && expedition.status !== 'completed' && expedition.status !== 'cancelled' && (
            <Link
              href={isAuthenticated ? `/sponsor/${expedition.id}` : `/auth?redirect=${encodeURIComponent(`/sponsor/${expedition.id}`)}`}
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
          {!isBlueprint && (
            <>
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
            </>
          )}
          <div className="flex justify-between border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
            <span className="text-[#616161] dark:text-[#b5bcc4]">Estimated Distance</span>
            <span className="font-bold dark:text-[#e5e5e5]">~{formatDistance(totalRouteDistance, 0)}</span>
          </div>
          {!isBlueprint && expedition.daysActive > 0 && (
            <div className="flex justify-between">
              <span className="text-[#616161] dark:text-[#b5bcc4]">Avg. Daily Distance</span>
              <span className="font-bold dark:text-[#e5e5e5]">~{formatDistance(totalRouteDistance / expedition.daysActive, 1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Blueprint Reviews */}
      {isBlueprint && (
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
          <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
            REVIEWS {(ratingsCount ?? 0) > 0 && `(${ratingsCount})`}
          </h3>

          {(ratingsCount ?? 0) > 0 ? (
            <>
              {/* Average rating summary */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={s <= Math.round(averageRating || 0) ? 'fill-[#ac6d46] text-[#ac6d46]' : 'text-[#b5bcc4] dark:text-[#616161]'}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold dark:text-[#e5e5e5]">{(averageRating || 0).toFixed(1)}</span>
                <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">({ratingsCount} {ratingsCount === 1 ? 'review' : 'reviews'})</span>
              </div>

              {/* Individual reviews feed */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {reviews.map((review) => (
                  <div key={review.id} className="text-xs">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Link href={`/journal/${review.explorer?.username}`} className="flex-shrink-0">
                        <ExplorerAvatar
                          username={review.explorer?.username || ''}
                          src={review.explorer?.picture}
                          size={24}
                        />
                      </Link>
                      <Link href={`/journal/${review.explorer?.username}`} className="font-bold text-[#202020] dark:text-[#e5e5e5] hover:text-[#ac6d46] transition-colors">
                        {review.explorer?.username}
                      </Link>
                      <div className="flex gap-0.5 ml-auto">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            className={s <= review.rating ? 'fill-[#ac6d46] text-[#ac6d46]' : 'text-[#b5bcc4] dark:text-[#616161]'}
                          />
                        ))}
                      </div>
                    </div>
                    {review.text && (
                      <p className="text-[#616161] dark:text-[#b5bcc4] leading-relaxed mb-1">{review.text}</p>
                    )}
                    {review.createdAt && (
                      <span className="text-[10px] text-[#b5bcc4] dark:text-[#616161]">
                        {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">No reviews yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
