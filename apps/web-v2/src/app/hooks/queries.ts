import { useQuery } from '@tanstack/react-query';
import { expeditionApi, explorerApi, entryApi, sponsorshipApi } from '@/app/services/api';

// ─── Home Page ────────────────────────────────────────────────────────────────

export function useGlobalFeed() {
  return useQuery({
    queryKey: ['feed', 'global'],
    queryFn: async () => {
      const [expeditions, explorers, entries] = await Promise.all([
        expeditionApi.getAll().catch(() => ({ data: [], results: 0 })),
        explorerApi.getAll().catch(() => ({ data: [], results: 0 })),
        entryApi.getAll().catch(() => ({ data: [], results: 0 })),
      ]);
      return { expeditions, explorers, entries };
    },
  });
}

export function useFollowingFeed(enabled: boolean) {
  return useQuery({
    queryKey: ['feed', 'following'],
    queryFn: async () => {
      const [expeditions, explorers, entries] = await Promise.all([
        expeditionApi.getAll({ context: 'following' }).catch(() => ({ data: [], results: 0 })),
        explorerApi.getAll({ context: 'following' }).catch(() => ({ data: [], results: 0 })),
        entryApi.getAll({ context: 'following' }).catch(() => ({ data: [], results: 0 })),
      ]);
      return { expeditions, explorers, entries };
    },
    enabled,
  });
}

// ─── Expedition Detail ───────────────────────────────────────────────────────

export function useExpeditionQuery(expeditionId: string | undefined) {
  return useQuery({
    queryKey: ['expedition', expeditionId],
    queryFn: () => expeditionApi.getById(expeditionId!),
    enabled: !!expeditionId,
    refetchOnWindowFocus: true,
  });
}

export function useExplorerProfileQuery(username: string | undefined) {
  return useQuery({
    queryKey: ['explorer', username],
    queryFn: () => explorerApi.getByUsername(username!),
    enabled: !!username,
  });
}

export function useExplorerTiersQuery(username: string | undefined) {
  return useQuery({
    queryKey: ['explorer', username, 'tiers'],
    queryFn: () => sponsorshipApi.getExplorerTiers(username!),
    enabled: !!username,
  });
}

export function useBlueprintReviewsQuery(expeditionId: string | undefined, isBlueprint: boolean) {
  return useQuery({
    queryKey: ['expedition', expeditionId, 'reviews'],
    queryFn: () => expeditionApi.getReviews(expeditionId!, { limit: 50 }),
    enabled: !!expeditionId && isBlueprint,
  });
}

// ─── Explorer Profile Page ───────────────────────────────────────────────────

export function useExplorerPageData(username: string | undefined) {
  return useQuery({
    queryKey: ['explorerPage', username],
    queryFn: async () => {
      const [profile, entriesRes, expeditionsRes, followersRes] = await Promise.all([
        explorerApi.getByUsername(username!),
        explorerApi.getEntries(username!),
        explorerApi.getExpeditions(username!),
        explorerApi.getFollowers(username!),
      ]);
      return {
        profile,
        entries: entriesRes.data || [],
        expeditions: expeditionsRes.data || [],
        followers: followersRes.data || [],
      };
    },
    enabled: !!username,
  });
}
