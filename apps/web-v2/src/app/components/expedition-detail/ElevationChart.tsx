'use client';

import { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WaypointType } from '@/app/components/expedition-detail/types';
import { useDistanceUnit } from '@/app/context/DistanceUnitContext';
import { useTheme } from '@/app/context/ThemeContext';

interface ElevationChartProps {
  waypoints: WaypointType[];
}

/**
 * Elevation profile across the expedition's waypoint sequence. Only renders
 * when at least 2 waypoints have an elevation value — any fewer and the chart
 * is either empty or a single point and not useful.
 *
 * Unit-aware: follows the global distance-unit preference (mi → feet,
 * everything else → metres).
 */
export function ElevationChart({ waypoints }: ElevationChartProps) {
  const gradientId = useId();
  const { unit } = useDistanceUnit();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const useFeet = unit === 'mi';
  const unitLabel = useFeet ? 'ft' : 'm';
  const M_TO_FT = 3.28084;

  // Dark mode palette for axes + tooltip — matches brand tokens used elsewhere.
  const axisTickColor = isDark ? '#b5bcc4' : '#616161';
  const axisLineColor = isDark ? '#616161' : '#b5bcc4';
  const tooltipBg = isDark ? '#202020' : '#ffffff';
  const tooltipBorder = isDark ? '#616161' : '#202020';
  const tooltipText = isDark ? '#e5e5e5' : '#202020';

  const data = useMemo(() => {
    return waypoints
      .map((wp, idx) => {
        const m = wp.elevationM;
        if (typeof m !== 'number' || !Number.isFinite(m)) return null;
        const value = useFeet ? m * M_TO_FT : m;
        return {
          index: idx + 1,
          name: wp.title || `Waypoint ${idx + 1}`,
          elevation: Math.round(value),
        };
      })
      .filter((d): d is { index: number; name: string; elevation: number } => d !== null);
  }, [waypoints, useFeet]);

  if (data.length < 2) return null;

  const values = data.map((d) => d.elevation);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Cumulative ascent — matches how the expedition-level gain stat is computed.
  let gain = 0;
  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gain += diff;
  }

  // Pad the Y-axis domain a bit so the line doesn't kiss the top edge.
  const pad = Math.max(1, Math.round((max - min) * 0.1));
  const yMin = Math.max(0, min - pad);
  const yMax = max + pad;

  return (
    <div className="border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020]">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#202020] dark:border-[#616161] bg-[#b5bcc4] dark:bg-[#3a3a3a] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#4676ac]" />
          <span className="text-xs font-mono font-semibold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
            ELEVATION PROFILE
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-[#202020] dark:text-[#e5e5e5]">
          <span>
            <span className="text-[#616161] dark:text-[#b5bcc4]">MIN </span>
            {min.toLocaleString()} {unitLabel}
          </span>
          <span>
            <span className="text-[#616161] dark:text-[#b5bcc4]">MAX </span>
            {max.toLocaleString()} {unitLabel}
          </span>
          <span>
            <span className="text-[#616161] dark:text-[#b5bcc4]">GAIN </span>
            {gain.toLocaleString()} {unitLabel}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-40 w-full px-2 py-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`elevationFill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4676ac" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#4676ac" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="index"
              tick={{ fontSize: 10, fill: axisTickColor, fontFamily: 'monospace' }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={{ stroke: axisLineColor }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: axisTickColor, fontFamily: 'monospace' }}
              axisLine={{ stroke: axisLineColor }}
              tickLine={{ stroke: axisLineColor }}
              width={40}
              tickFormatter={(v: number) => v.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                border: `2px solid ${tooltipBorder}`,
                borderRadius: 0,
                fontFamily: 'monospace',
                fontSize: 11,
                color: tooltipText,
              }}
              labelStyle={{ color: tooltipText, fontWeight: 600 }}
              itemStyle={{ color: tooltipText }}
              cursor={{ stroke: axisLineColor, strokeWidth: 1 }}
              labelFormatter={(_label, payload) => {
                const first = payload?.[0]?.payload as { name?: string } | undefined;
                return first?.name || '';
              }}
              formatter={(value: number) => [
                `${value.toLocaleString()} ${unitLabel}`,
                'Elevation',
              ]}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#4676ac"
              strokeWidth={2}
              fill={`url(#elevationFill-${gradientId})`}
              isAnimationActive={false}
              dot={{ r: 2, fill: '#4676ac', stroke: tooltipBg, strokeWidth: 1 }}
              activeDot={{ r: 4, fill: '#ac6d46', stroke: tooltipBg, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
