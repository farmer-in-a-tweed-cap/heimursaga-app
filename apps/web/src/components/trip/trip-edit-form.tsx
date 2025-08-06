'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ITripDetail, IWaypointDetail } from '@repo/types';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Switch,
} from '@repo/ui/components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@repo/ui/hooks';

import { apiClient, API_QUERY_KEYS } from '@/lib/api';

import { MapCoordinatesValue, MapWaypointValue, useModal } from '@/hooks';
import { randomIntegerId, zodMessage } from '@/lib';
import { MODALS } from '@/components/modal/modal-registry';

import { TripWaypointCard } from './trip-waypoint-card';
import {
  TripWaypointCreateForm,
  TripWaypointCreateFormSubmitHandler,
} from './trip-waypoint-create-form';
import { TripWaypointEditForm } from './trip-waypoint-edit-form';

const schema = z.object({
  title: z
    .string()
    .nonempty(zodMessage.required('title'))
    .min(0, zodMessage.string.min('title', 0))
    .max(100, zodMessage.string.max('title', 100)),
  public: z.boolean(),
});

export const TRIP_EDIT_FORM_ID = 'trip_edit_form';

type Props = {
  trip?: ITripDetail;
  waypoint?: MapWaypointValue | null;
  waypoints?: IWaypointDetail[];
  map?: {
    center: MapCoordinatesValue;
  };
  onLoading?: (loading: boolean) => void;
  onWaypointCreateSubmit?: (waypoint: MapWaypointValue) => void;
  onWaypointCreateStart?: (waypoint: MapWaypointValue) => void;
  onWaypointCreateCancel?: () => void;
  onWaypointDelete?: (id: number) => void;
  onWaypointEditStart?: (waypoint: MapWaypointValue) => void;
  onWaypointEditCancel?: () => void;
  onWaypointEditSubmit?: (waypoint: MapWaypointValue) => void;
  onSubmit?: TripEditFormSubmitHandler;
  onDelete?: () => void;
};

export type TripEditFormSubmitHandler = (values: { title: string; public: boolean }) => void;

export const TripEditForm: React.FC<Props> = ({
  trip,
  waypoint,
  waypoints = [],
  map,
  onWaypointCreateStart,
  onWaypointCreateCancel,
  onWaypointCreateSubmit,
  onWaypointDelete,
  onWaypointEditStart,
  onWaypointEditCancel,
  onWaypointEditSubmit,
  onLoading = () => {},
  onSubmit = () => {},
  onDelete = () => {},
}) => {
  const modal = useModal();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [loading, setLoading] = useState<{ trip: boolean; waypoint: boolean }>({
    trip: false,
    waypoint: false,
  });

  const [waypointCreating, setWaypointCreating] = useState<boolean>(false);
  const [waypointEditing, setWaypointEditing] = useState<boolean>(false);
  const [waypointEditingId, setWaypointEditingId] = useState<number | null>(
    null,
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: trip?.title || '',
      public: trip?.public ?? true,
    },
  });

  const handleWaypointCreateStart = () => {
    setWaypointCreating(true);

    if (map?.center && onWaypointCreateStart) {
      onWaypointCreateStart({
        id: randomIntegerId(),
        lat: map.center.lat,
        lon: map.center.lon,
      });
    }
  };

  const handleWaypointCreateCancel = () => {
    setWaypointCreating(false);

    if (onWaypointCreateCancel) {
      onWaypointCreateCancel();
    }
  };

  const handleWaypointCreateSubmit: TripWaypointCreateFormSubmitHandler =
    async (values) => {
      try {
        const { date, title, lat, lon } = values;
        const tripId = trip?.id;

        if (!tripId) return;

        setLoading((state) => ({ ...state, waypoint: true }));

        // create a point
        const { success, data } = await apiClient.createWaypoint({
          query: {},
          payload: {
            lat,
            lon,
            date,
            title,
            tripId,
          },
        });
        const waypointId = data?.id;

        if (success) {
          setWaypointCreating(false);
          setLoading((state) => ({ ...state, waypoint: false }));
          toast({ type: 'success', message: 'Waypoint added' });

          if (waypointId) {
            const waypoint = {
              id: waypointId,
              title,
              lat,
              lon,
              date,
            };

            if (onWaypointCreateSubmit) {
              onWaypointCreateSubmit(waypoint);
            }
          }
        } else {
          setLoading((state) => ({ ...state, waypoint: false }));
          toast({ type: 'error', message: 'Failed to add waypoint' });
        }
      } catch (e) {
        setLoading((state) => ({ ...state, waypoint: false }));
        toast({ type: 'error', message: 'Failed to add waypoint' });
      }
    };

  const handleWaypointEditStart = (id: number) => {
    setWaypointEditing(true);
    setWaypointEditingId(id);

    const waypoint = waypoints.find((waypoint) => waypoint.id === id);
    if (!waypoint) return;

    if (onWaypointEditStart) {
      onWaypointEditStart(waypoint);
    }
  };

  const handleWaypointEditCancel = () => {
    setWaypointEditing(false);
    setWaypointEditingId(null);
    
    if (onWaypointEditCancel) {
      onWaypointEditCancel();
    }
  };


  const handleWaypointDelete = async (id: number) => {
    if (confirm(`remove this waypoint?`)) {
      try {
        const tripId = trip?.id;
        const waypointId = id;

        if (!tripId || !waypointId) return;

        // delete the waypoint
        const { success } = await apiClient.deleteTripWaypoint({
          query: { tripId, waypointId },
        });

        if (success) {
          toast({ type: 'success', message: 'Waypoint removed' });
          if (onWaypointDelete) {
            onWaypointDelete(waypointId);
          }
        } else {
          toast({ type: 'error', message: 'Failed to remove waypoint' });
        }
      } catch (e) {
        toast({ type: 'error', message: 'Failed to remove waypoint' });
      }
    }
  };

  const handleTripUpdate = async (values: { title?: string; public?: boolean }) => {
    try {
      const tripId = trip?.id;
      if (!tripId) return;

      setLoading((state) => ({ ...state, trip: true }));
      onLoading(true);

      // update the trip
      const { success } = await apiClient.updateTrip({
        query: { tripId },
        payload: values,
      });

      if (success) {
        setLoading((state) => ({ ...state, trip: false }));
        onLoading(false);
        onSubmit(values);
        toast({ type: 'success', message: 'Journey updated' });
      } else {
        setLoading((state) => ({ ...state, trip: false }));
        onLoading(false);
        toast({ type: 'error', message: 'Failed to update journey' });
      }
    } catch (e) {
      setLoading((state) => ({ ...state, trip: false }));
      onLoading(false);
      toast({ type: 'error', message: 'Failed to update journey' });
    }
  };

  const handleDelete = async () => {
    // First show confirmation
    modal.open(MODALS.ACTION, {
      props: {
        title: 'Delete Journey',
        message: 'Are you sure you want to delete this journey? This action cannot be undone and will delete all associated waypoints.',
        submit: {
          buttonText: 'Delete Journey',
          onClick: () => {
            // This will close the modal, then perform the actual deletion
            performDelete();
          },
        },
        cancel: {
          buttonText: 'Cancel',
          onClick: () => {},
        },
      },
    });
  };

  const performDelete = async () => {
    try {
      const tripId = trip?.id;
      console.log('Attempting to delete trip with ID:', tripId);
      
      if (!tripId) {
        console.error('No trip ID available');
        return;
      }

      const response = await apiClient.deleteTrip({
        query: { tripId },
      });

      console.log('Delete response:', response);

      if (response.success) {
        console.log('Delete successful, invalidating cache and calling onDelete');
        toast({ type: 'success', message: 'Journey deleted' });
        // Invalidate the trips cache so the list refreshes
        await queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.TRIPS] });
        onDelete();
      } else {
        console.error('Delete failed:', response);
        toast({ type: 'error', message: 'Failed to delete journey' });
      }
    } catch (e) {
      console.error('Failed to delete journey:', e);
      toast({ type: 'error', message: 'Failed to delete journey' });
    }
  };

  return (
    <div className="relative w-full h-auto flex flex-col">
      <div className="w-full h-auto flex flex-col gap-10">
        <Section title="Journey">
          <div className="mb-6 text-sm text-gray-600">
            <p className="mb-2">Plan your journey here by adding future waypoints</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>waypoints can be converted into entries when the date becomes present or past</li>
              <li>entries can be added to a saved journey at any time via the "create entry" page</li>
            </ul>
          </div>
          <Form {...form}>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        disabled={loading.trip} 
                        required 
                        {...field}
                        onBlur={(e) => {
                          field.onBlur(e);
                          if (e.target.value !== trip?.title) {
                            handleTripUpdate({ title: e.target.value });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="public"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Public</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          handleTripUpdate({ public: checked });
                        }}
                        disabled={loading.trip}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </Section>
        <Section title="Waypoints">
          {waypoints.length >= 1 && (
            <div className="w-full h-auto flex flex-col gap-2">
              {waypoints.map(({ id, title, lat, lon, date, post }, key) =>
                waypointEditingId === id ? (
                  <div
                    key={key}
                    className="py-4 border-b border-solid border-accent"
                  >
                    <TripWaypointEditForm
                      defaultValues={{ 
                        title, 
                        lat: waypoint?.id === id ? waypoint.lat : lat, 
                        lon: waypoint?.id === id ? waypoint.lon : lon, 
                        date: date instanceof Date ? date : new Date(date || new Date())
                      }}
                      loading={loading.waypoint}
                      onCancel={handleWaypointEditCancel}
                      onSubmit={(values) => {
                        // Update the waypoint with the current coordinates (potentially from dragging)
                        const updatedWaypoint = {
                          id,
                          lat: waypoint?.id === id ? waypoint.lat : values.lat || lat,
                          lon: waypoint?.id === id ? waypoint.lon : values.lon || lon,
                          title: values.title || title,
                          date: values.date instanceof Date ? values.date : new Date(values.date || date || new Date())
                        };
                        
                        if (onWaypointEditSubmit) {
                          onWaypointEditSubmit(updatedWaypoint);
                        }
                        
                        setWaypointEditing(false);
                        setWaypointEditingId(null);
                        toast({ type: 'success', message: 'Waypoint updated' });
                      }}
                    />
                  </div>
                ) : (
                  <TripWaypointCard
                    key={key + 1}
                    id={id}
                    orderIndex={key + 1}
                    lat={lat}
                    lon={lon}
                    title={title || ''}
                    date={date || new Date()}
                    post={post}
                    onEdit={handleWaypointEditStart}
                    onDelete={handleWaypointDelete}
                  />
                ),
              )}
            </div>
          )}

          {waypointCreating && (
            <div className="w-full py-4">
              <TripWaypointCreateForm
                loading={loading.waypoint}
                lat={waypoint?.lat || 0}
                lon={waypoint?.lon || 0}
                onSubmit={handleWaypointCreateSubmit}
                onCancel={handleWaypointCreateCancel}
              />
            </div>
          )}
          {!waypointCreating && !waypointEditing && (
            <div className="flex flex-col">
              <Button variant="secondary" onClick={handleWaypointCreateStart}>
                Add waypoint
              </Button>
            </div>
          )}
        </Section>
        
        {/* Delete Journey Section */}
        <Section title="Delete Journey">
          <div className="flex flex-col gap-4">
            <div className="text-sm text-gray-600">
              <p className="font-medium text-red-600 mb-2">Danger Zone</p>
              <p>Deleting this journey will permanently remove it and all associated waypoints. This action cannot be undone.</p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="self-start"
            >
              Delete Journey
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children?: React.ReactNode }> = ({
  title,
  children,
}) => {
  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-medium">{title}</h2>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </div>
  );
};
