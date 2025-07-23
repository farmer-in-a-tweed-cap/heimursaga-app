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

import { apiClient } from '@/lib/api';

import { MapCoordinatesValue, MapWaypointValue } from '@/hooks';
import { randomIntegerId, zodMessage } from '@/lib';

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
  onWaypointEditSubmit?: (waypoint: MapWaypointValue) => void;
  onSubmit?: TripEditFormSubmitHandler;
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
  onWaypointEditSubmit,
  onLoading = () => {},
  onSubmit = () => {},
}) => {
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
        }
      } catch (e) {
        setLoading((state) => ({ ...state, waypoint: false }));
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
  };

  const handleWaypointEditSubmit = () => {
    //
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
          if (onWaypointDelete) {
            onWaypointDelete(waypointId);
          }
        }
      } catch (e) {
        //
      }
    }
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { title, public: isPublic } = values;
        const tripId = trip?.id;

        if (!tripId) return;

        setLoading((state) => ({ ...state, trip: true }));
        onLoading(true);

        // update the trip
        const { success } = await apiClient.updateTrip({
          query: { tripId },
          payload: { title, public: isPublic },
        });

        if (success) {
          setLoading((state) => ({ ...state, trip: false }));
          onLoading(false);
          onSubmit({ title, public: isPublic });
        } else {
          setLoading((state) => ({ ...state, trip: false }));
          onLoading(false);
        }
      } catch (e) {
        setLoading((state) => ({ ...state, trip: false }));
        onLoading(false);
      }
    },
  );

  return (
    <div className="relative w-full h-auto flex flex-col">
      <div className="w-full h-auto flex flex-col gap-10">
        <Section title="Journey">
          <Form {...form}>
            <form id={TRIP_EDIT_FORM_ID} onSubmit={handleSubmit}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input disabled={loading.trip} required {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="public"
                render={({ field }) => (
                  <FormItem className="mt-6">
                    <FormLabel>Public</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={loading.trip}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input disabled={loading} required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
            </form>
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
                      defaultValues={{ title, lat, lon, date }}
                      loading={loading.waypoint}
                      onCancel={handleWaypointEditCancel}
                      onSubmit={handleWaypointEditSubmit}
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
