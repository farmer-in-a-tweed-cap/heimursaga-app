'use client';

import { Button, LoadingSpinner } from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { PlusIcon } from '@repo/ui/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

import { SponsorshipTierManageCard } from './sponsorship-tier-manage-card';
import { SponsorshipTierEditForm, SponsorshipTierEditFormSubmitHandler } from './sponsorship-tier-edit-form';

export const SponsorshipTierView = () => {
  const session = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [creatingNew, setCreatingNew] = useState(false);

  const sponsorshipTierQuery = useQuery({
    queryKey: [API_QUERY_KEYS.SPONSORSHIP_TIERS],
    queryFn: () => apiClient.getSponsorshipTiers().then(({ data }) => data),
    enabled: !!session?.username,
    retry: 0,
  });

  const createTierMutation = useMutation({
    mutationFn: apiClient.createSponsorshipTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.SPONSORSHIP_TIERS] });
      toast({ type: 'success', message: 'New sponsorship tier created' });
      setCreatingNew(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message;
      if (errorMessage && errorMessage.includes('Maximum 3 sponsorship tiers')) {
        toast({ type: 'error', message: 'Maximum 3 sponsorship tiers allowed' });
      } else {
        toast({ type: 'error', message: 'Failed to create tier' });
      }
    },
  });

  const sponsorships = sponsorshipTierQuery.data?.data || [];
  const sponsorshipsCount = sponsorshipTierQuery.data?.results || 0;
  const canAddMore = sponsorshipsCount < 3;

  const handleCreateNew = () => {
    setCreatingNew(true);
  };

  const handleCreateSubmit: SponsorshipTierEditFormSubmitHandler = (data) => {
    if (data?.price && data?.description) {
      createTierMutation.mutate({
        query: {},
        payload: {
          price: data.price,
          description: data.description,
          isAvailable: false,
          priority: sponsorshipsCount + 1,
        },
      });
    }
  };

  const handleCreateCancel = () => {
    setCreatingNew(false);
  };

  return (
    <div className="flex flex-col">
      {sponsorshipTierQuery.isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Sponsorship Tiers</h3>
              <p className="text-sm text-gray-600">
                Create up to 3 tiers for your sponsors to choose from
              </p>
            </div>
            {canAddMore && !creatingNew && (
              <Button onClick={handleCreateNew} size="sm">
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Tier
              </Button>
            )}
          </div>

          {/* Existing Tiers */}
          {sponsorshipsCount > 0 && (
            <div className="space-y-3">
              {sponsorships
                .sort((a, b) => a.price - b.price)
                .map((tier, key) => (
                  <SponsorshipTierManageCard
                    key={tier.id}
                    id={tier.id}
                    price={tier.price}
                    description={tier.description}
                    isAvailable={tier.isAvailable}
                    membersCount={tier.membersCount}
                    priority={tier.priority}
                    tierNumber={key + 1}
                  />
                ))}
            </div>
          )}

          {/* Create New Tier Form */}
          {creatingNew && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-4">Create New Tier</h4>
              <SponsorshipTierEditForm
                onSubmit={handleCreateSubmit}
                onCancel={handleCreateCancel}
                loading={createTierMutation.isPending}
              />
            </div>
          )}

          {/* Empty State */}
          {sponsorshipsCount === 0 && !creatingNew && (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="space-y-3">
                <div className="text-gray-400">
                  <PlusIcon className="w-12 h-12 mx-auto" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">No sponsorship tiers yet</h4>
                  <p className="text-gray-600">Create your first tier to start accepting sponsors</p>
                </div>
                <Button onClick={handleCreateNew}>
                  Create First Tier
                </Button>
              </div>
            </div>
          )}

          {/* Tier Limit Info */}
          <div className="text-xs text-gray-500">
            {sponsorshipsCount}/3 tiers created
          </div>
        </div>
      )}
    </div>
  );
};
