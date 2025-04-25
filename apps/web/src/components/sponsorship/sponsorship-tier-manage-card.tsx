'use client';

import { Button, Card, CardContent, Switch } from '@repo/ui/components';
import { useState } from 'react';

import { apiClient } from '@/lib/api';

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
};

export const SponsorshipTierManageCard: React.FC<Props> = ({
  id,
  isAvailable = false,
  membersCount = 0,
  ...props
}) => {
  const [state, setState] = useState<{ price: number; description: string }>({
    price: props.price,
    description: props.description,
  });
  const [available, setAvailable] = useState<boolean>(isAvailable || false);
  const [loading, setLoading] = useState<boolean>(false);
  const [editing, setEditing] = useState<boolean>(false);

  const { price, description } = state;

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

  return (
    <div className="flex flex-col">
      <Card>
        <CardContent>
          {editing ? (
            <SponsorshipTierEditForm
              membershipTierId={id}
              defaultValues={{
                price,
                description,
              }}
              onSubmit={handleSave}
              onCancel={handleCancel}
            />
          ) : (
            <div className="flex flex-col">
              <div className="flex flex-row justify-between">
                <div className="flex flex-col justify-start items-start gap-0">
                  <span className="font-medium text-base text-black">
                    ${price}/month
                  </span>
                  <span className="font-normal text-base text-gray-500">
                    {membersCount} members
                  </span>
                </div>
                <div>
                  <Switch
                    checked={available}
                    aria-readonly
                    disabled={loading}
                    onCheckedChange={handleToggleAvailability}
                  />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-base">{description}</p>
              </div>
            </div>
          )}
          {!editing && (
            <div className="mt-6 flex flex-row items-center justify-start gap-2">
              <Button variant="outline" onClick={handleEdit}>
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
