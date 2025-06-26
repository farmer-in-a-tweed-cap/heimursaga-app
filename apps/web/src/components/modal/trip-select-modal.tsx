'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SelectInput,
} from '@repo/ui/components';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { useSession } from '@/hooks';

import { ModalBaseProps } from './modal-provider';

type State = {};

export type TripSelectModalProps = State;

export type TripSelectModalSubmitHandler = (data: {
  id: string;
  title: string;
}) => void;

const TripSelectModal: React.FC<ModalBaseProps<TripSelectModalProps>> = ({
  props,
  close,
  onSubmit,
  onCancel,
}) => {
  const session = useSession();

  const [loading, setLoading] = useState(false);
  const [tripId, setTripId] = useState<string>();

  const tripQuery = useQuery({
    queryKey: [API_QUERY_KEYS.TRIPS],
    queryFn: () => apiClient.getTrips().then(({ data }) => data),
    enabled: session.creator,
  });

  const trips = tripQuery.data?.data || [];

  const handleSubmit = async () => {
    if (!tripId) return;

    const trip = trips.find((trip) => trip.id === tripId);
    if (!trip) return;

    const handler = onSubmit as TripSelectModalSubmitHandler;

    if (handler) {
      setLoading(true);
      handler({ id: trip.id, title: trip.title });
      close();
    }
  };

  const handleChange = (value: string) => {
    setTripId(value);
  };

  const handleCancel = () => {
    close();
    if (onCancel) {
      onCancel();
    }
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Select journey</DialogTitle>
      </DialogHeader>
      <div className="relative w-full h-full flex items-center rounded-lg overflow-hidden">
        <SelectInput
          items={trips.map(({ id, title }) => ({
            value: id,
            label: title,
          }))}
          value={tripId}
          placeholder="Select journey"
          loading={tripQuery.isPending || tripQuery.isLoading}
          disabled={tripQuery.isFetched && trips.length <= 0}
          onValueChange={handleChange}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleCancel}>
          Discard
        </Button>
        <Button loading={loading} onClick={handleSubmit}>
          Select
        </Button>
      </DialogFooter>
    </>
  );
};

export default TripSelectModal;
