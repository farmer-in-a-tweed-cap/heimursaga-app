'use client';

import { Button, Card, CardContent, Switch } from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { TrashIcon } from '@repo/ui/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import {
  SponsorshipTierEditForm,
  SponsorshipTierEditFormSubmitHandler,
} from './sponsorship-tier-edit-form';

type Props = {
  id: string;
  price: number;
  description: string;
  isAvailable?: boolean;
  membersCount?: number;
  priority?: number;
  tierNumber?: number;
};

export const SponsorshipTierManageCard: React.FC<Props> = ({
  id,
  isAvailable = false,
  membersCount = 0,
  priority,
  tierNumber = 1,
  ...props
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState<{ price: number; description: string }>({
    price: props.price,
    description: props.description,
  });
  const [available, setAvailable] = useState<boolean>(isAvailable || false);
  const [loading, setLoading] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);

  const { price, description } = state;

  const deleteTierMutation = useMutation({
    mutationFn: () => apiClient.deleteSponsorshipTierById({ query: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.SPONSORSHIP_TIERS] });
      toast({ type: 'success', message: 'Sponsorship tier deleted' });
    },
    onError: () => {
      toast({ type: 'error', message: 'Failed to delete tier' });
    },
  });

  const handleToggleAvailability = async () => {
    setLoading(true);

    const isAvailable = !available;

    // update the sponsorship tier
    await apiClient.updateSponsorshipTierById({
      query: { id },
      payload: { isAvailable },
    });

    setAvailable(() => isAvailable);

    setLoading(false);
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleSave: SponsorshipTierEditFormSubmitHandler = (data) => {
    setEditing(false);
    setState((state) => ({ ...state, ...data }));
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this tier? This action cannot be undone.')) {
      deleteTierMutation.mutate();
    }
  };

  return (
    <div className="flex flex-col">
      <Card>
        <CardContent>
          {editing ? (
            <SponsorshipTierEditForm
              sponsorshipTierId={id}
              defaultValues={{
                price,
                description,
              }}
              onSubmit={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <div className="flex flex-col">
              {/* Header with tier number and availability toggle */}
              <div className="flex flex-row justify-between items-start">
                <div className="flex flex-col justify-start items-start gap-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Tier {tierNumber}
                    </span>
                    <span className="font-medium text-base text-black">
                      ${price}/month
                    </span>
                  </div>
                  <span className="font-normal text-sm text-gray-500 mt-1">
                    {membersCount} members • ${Math.round(price * 12 * 0.9)}/year
                  </span>
                </div>
                <div>
                  <Switch
                    checked={available}
                    aria-readonly
                    disabled={loading || deleteTierMutation.isPending}
                    onCheckedChange={handleToggleAvailability}
                  />
                </div>
              </div>
              
              {/* Description */}
              <div className="mt-4">
                <p className="text-base">{description}</p>
              </div>
              
              {/* Status indicator */}
              <div className="mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {available ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          )}
          {!editing && (
            <div className="mt-6 flex flex-row items-center justify-between">
              <div className="flex flex-row items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  disabled={loading || deleteTierMutation.isPending}
                >
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading || deleteTierMutation.isPending || membersCount > 0}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
              
              {membersCount > 0 && (
                <span className="text-xs text-gray-500">
                  Cannot delete tier with active members
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
