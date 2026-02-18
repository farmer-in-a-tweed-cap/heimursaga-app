import { useState, useEffect } from 'react';

import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { weatherApi, type ActivityPulseResponse } from '@/app/services/api';

import { CountryFlag } from './CountryFlag';

interface PlatformStatsProps {
  explorerCount: number;
  expeditionCount: number;
  entryCount: number;
}

function StatTile({ label, value, detail }: { label: string; value: React.ReactNode; detail: React.ReactNode }) {
  return (
    <div className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4 hover:border-[#ac6d46] dark:hover:border-[#ac6d46] transition-all">
      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-mono">{label}</div>
      <div className="text-2xl font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">{value}</div>
      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
        {detail}
      </div>
    </div>
  );
}

export function PlatformStats({ explorerCount, expeditionCount, entryCount }: PlatformStatsProps) {
  const { formatDistance } = useDistanceUnit();
  const [data, setData] = useState<ActivityPulseResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const result = await weatherApi.getStats();
        if (!cancelled) {
          setData(result);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const hasLiveData = data && !error && (
    data.activeExplorers > 0 ||
    data.newEntriesThisWeek > 0 ||
    data.totalDistanceKm > 0 ||
    data.countriesReached > 0
  );

  const fallbackStats = [
    { label: 'EXPLORERS', value: explorerCount.toLocaleString(), detail: 'Registered explorers' },
    { label: 'EXPEDITIONS', value: expeditionCount.toLocaleString(), detail: 'Published expeditions' },
    { label: 'JOURNAL ENTRIES', value: entryCount.toLocaleString(), detail: 'Published entries' },
    { label: 'PLATFORM STATUS', value: '100%', detail: 'All systems operational' },
  ];

  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
      <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
        <h3 className="text-sm font-bold dark:text-[#e5e5e5]">
          {hasLiveData ? 'LIVE EXPLORATION PULSE' : 'PLATFORM STATISTICS'}
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {hasLiveData ? (
          <ActivityPulseTiles data={data} formatDistance={formatDistance} />
        ) : (
          fallbackStats.map((stat, idx) => (
            <StatTile key={idx} label={stat.label} value={stat.value} detail={stat.detail} />
          ))
        )}
      </div>
    </div>
  );
}

function ActivityPulseTiles({ data, formatDistance }: { data: ActivityPulseResponse; formatDistance: (km: number, decimals?: number) => string }) {
  return (
    <>
      {/* Tile 1: Active Now */}
      <StatTile
        label="ACTIVE NOW"
        value={data.activeExplorers}
        detail={
          data.activeExpeditions === 1
            ? `${data.activeExplorers} explorer in the field`
            : `${data.activeExpeditions} expedition${data.activeExpeditions !== 1 ? 's' : ''} live`
        }
      />

      {/* Tile 2: New This Week */}
      <StatTile
        label="NEW THIS WEEK"
        value={data.newEntriesThisWeek}
        detail={
          data.newExpeditionsThisWeek > 0
            ? `entries, +${data.newExpeditionsThisWeek} expedition${data.newExpeditionsThisWeek !== 1 ? 's' : ''}`
            : 'entries this week'
        }
      />

      {/* Tile 3: Distance Logged */}
      <StatTile
        label="DISTANCE LOGGED"
        value={formatDistance(data.totalDistanceKm, 0)}
        detail={`Across ${data.activeExpeditions} route${data.activeExpeditions !== 1 ? 's' : ''}`}
      />

      {/* Tile 4: Global Reach */}
      <StatTile
        label="GLOBAL REACH"
        value={data.countriesReached}
        detail={
          data.countryFlags.length > 0 ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              {data.countryFlags.slice(0, 8).map((code) => (
                <CountryFlag key={code} code={code} className="w-5 h-auto inline-block" />
              ))}
              {data.countryFlags.length > 8 && (
                <span className="text-[#616161] dark:text-[#b5bcc4]">+{data.countryFlags.length - 8}</span>
              )}
            </span>
          ) : (
            'Countries reached'
          )
        }
      />
    </>
  );
}
