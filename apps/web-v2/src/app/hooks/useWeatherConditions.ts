import { useState, useEffect } from 'react';
import { weatherApi, type Expedition, type ExpeditionCondition } from '@/app/services/api';

export function useWeatherConditions(
  apiExpedition: Expedition | null,
  expeditionId: string | undefined,
) {
  const [weatherCondition, setWeatherCondition] = useState<ExpeditionCondition | null>(null);
  const [weatherLocalTime, setWeatherLocalTime] = useState<string>('');

  // Fetch weather conditions
  useEffect(() => {
    if (!apiExpedition || apiExpedition.status !== 'active') return;
    if (apiExpedition.currentLocationVisibility !== 'public') return;

    let cancelled = false;

    const fetchWeather = async () => {
      try {
        const result = await weatherApi.getConditions();
        if (!cancelled) {
          const match = result.conditions.find(
            (c) => c.expeditionId === expeditionId,
          );
          setWeatherCondition(match || null);
        }
      } catch {
        // Weather is supplementary — fail silently
      }
    };

    fetchWeather();
    return () => { cancelled = true; };
  }, [apiExpedition, expeditionId]);

  // Update local time display every 60s
  useEffect(() => {
    if (!weatherCondition?.timezone) return;

    const updateTime = () => {
      try {
        const formatted = new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: weatherCondition.timezone,
        }).format(new Date());
        setWeatherLocalTime(formatted);
      } catch {
        setWeatherLocalTime('');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60_000);
    return () => clearInterval(interval);
  }, [weatherCondition?.timezone]);

  return { weatherCondition, weatherLocalTime };
}
