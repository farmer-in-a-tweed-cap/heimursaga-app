import { useMemo } from 'react';
import type { Expedition } from '@/app/services/api';
import type { FundingStats, SponsorWithTotal } from '@/app/components/expedition-detail/types';

export function useExpeditionSponsors(apiExpedition: Expedition | null) {
  const fundingStats: FundingStats = useMemo(() => ({
    activeSubscribers: apiExpedition?.recurringStats?.activeSponsors || 0,
    monthlyRecurring: apiExpedition?.recurringStats?.monthlyRevenue || 0,
    totalRecurringToDate: apiExpedition?.recurringStats?.totalCommitted || 0,
  }), [apiExpedition?.recurringStats]);

  const sponsors: SponsorWithTotal[] = useMemo(() => {
    if (!apiExpedition?.sponsors) return [];

    const now = new Date();
    const expStart = apiExpedition.createdAt ? new Date(apiExpedition.createdAt) : now;
    const expEnd = apiExpedition.endDate ? new Date(apiExpedition.endDate) : now;

    return apiExpedition.sponsors
      .map((s: any) => {
        let totalContribution = s.amount || 0;
        if (s.type?.toUpperCase() === 'SUBSCRIPTION') {
          const subStart = s.createdAt ? new Date(s.createdAt) : now;
          const overlapStart = subStart > expStart ? subStart : expStart;
          if (overlapStart <= expEnd) {
            const diffMs = expEnd.getTime() - overlapStart.getTime();
            const msPerMonth = 30 * 24 * 60 * 60 * 1000;
            const months = Math.max(1, Math.ceil(diffMs / msPerMonth));
            totalContribution = months * (s.amount || 0);
          }
        }
        return { ...s, totalContribution };
      })
      .sort((a: any, b: any) => b.totalContribution - a.totalContribution);
  }, [apiExpedition]);

  return { sponsors, fundingStats };
}
