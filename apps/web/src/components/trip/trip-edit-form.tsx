'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ITripDetail } from '@repo/types';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@repo/ui/components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import { MapCoordinatesValue, useMap } from '@/hooks';
import { zodMessage } from '@/lib';

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
});

export const TRIP_EDIT_FORM_ID = 'trip_edit_form';

type Props = {
  trip?: ITripDetail;
  map?: {
    center: MapCoordinatesValue;
  };
  onLoading?: (loading: boolean) => void;
  onWaypointCreateStart?: TripEditFormWaypointAddHandler;
  onWaypointCreateCancel?: () => void;
  onSubmit?: TripEditFormSubmitHandler;
};

export type TripEditFormWaypointAddHandler = (
  waypoint: MapCoordinatesValue & { id: number },
) => void;

export type TripEditFormSubmitHandler = (values: { title: string }) => void;

export const TripEditForm: React.FC<Props> = ({
  trip,
  map,
  onWaypointCreateStart,
  onWaypointCreateCancel,
  onLoading = () => {},
  onSubmit = () => {},
}) => {
  const [loading, setLoading] = useState<{ trip: boolean; waypoint: boolean }>({
    trip: false,
    waypoint: false,
  });

  const [waypoint, setWaypoint] = useState<MapCoordinatesValue | null>(null);
  const [waypointCreating, setWaypointCreating] = useState<boolean>(false);
  const [waypointEditing, setWaypointEditing] = useState<boolean>(false);
  const [waypointEditingId, setWaypointEditingId] = useState<number | null>(
    null,
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: trip?.title || '',
    },
  });

  const waypoints = trip?.waypoints || [];

  const handleWaypointCreateStart = () => {
    setWaypointCreating(true);

    if (map?.center && onWaypointCreateStart) {
      onWaypointCreateStart({
        id: Date.now(),
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
    async (data) => {
      try {
        const { date, title, lat, lon } = data;
        const tripId = trip?.id;

        if (!tripId) return;

        setLoading((state) => ({ ...state, waypoint: true }));

        // create a point
        const { success } = await apiClient.createWaypoint({
          query: {},
          payload: {
            lat,
            lon,
            date,
            title,
            tripId,
          },
        });

        if (success) {
          alert('waypoint created');

          setWaypointCreating(false);
          setLoading((state) => ({ ...state, waypoint: false }));

          // @todo
          // setWaypoints((waypoints) =>
          //   sortByDate(
          //     [...waypoints, { ...data, id: waypoints.length + 1 }],
          //     'asc',
          //   ),
          // );
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
  };

  const handleWaypointEditCancel = () => {
    setWaypointEditing(false);
    setWaypointEditingId(null);
  };

  // const handleWaypointEditSubmit = async (
  //   id: number,
  //   data: Partial<TripWaypointEditFormState>,
  // ) => {
  //   try {
  //     // const waypointId = state.waypointEditingId
  //     //   ? state.waypointEditingId
  //     //   : undefined;
  //     const waypointId = id;
  //     const { lat, lon, date, title } = data;

  //     if (!trip?.id || !waypointId) return;

  //     setLoading((state) => ({ ...state, waypoint: true }));

  //     // update the waypoint
  //     const { success } = await apiClient.updateTripWaypoint({
  //       query: { tripId: trip.id, waypointId },
  //       payload: { lat, lon, date, title },
  //     });

  //     if (success) {
  //       setState((state) => ({
  //         ...state,
  //         waypointEditing: false,
  //         waypointEditingId: undefined,
  //       }));
  //       setWaypoints((waypoints) => {
  //         const waypointIndex = waypoints.findIndex(
  //           (el) => el.id === waypointEditingId,
  //         );
  //         if (waypointIndex > -1) {
  //           const prev = waypoints[waypointIndex];
  //           waypoints[waypointIndex] = { ...prev, ...data };
  //         }

  //         return sortByDate(waypoints, 'asc');
  //       });
  //       setLoading((state) => ({ ...state, waypoint: false }));
  //     } else {
  //       setLoading((state) => ({ ...state, waypoint: false }));
  //     }
  //   } catch (e) {
  //     setLoading((state) => ({ ...state, waypoint: false }));
  //   }
  // };

  // const handleWaypointEditCancel = () => {
  //   setState((state) => ({
  //     ...state,
  //     waypointEditing: false,
  //     waypointEditingId: undefined,
  //   }));
  // };

  // const handleWaypointDelete: TripWaypointCardClickHandler = async (id) => {
  //   if (confirm(`delete this waypoint?`)) {
  //     try {
  //       const waypointId = id;

  //       if (!trip?.id || !waypointId) return;

  //       // delete the waypoint
  //       const { success } = await apiClient.deleteTripWaypoint({
  //         query: { tripId: trip.id, waypointId },
  //       });

  //       if (success) {
  //         setWaypoints((waypoints) => waypoints.filter((el) => el.id !== id));
  //       } else {
  //         //
  //       }
  //     } catch (e) {
  //       //
  //     }
  //   }
  // };

  // const handleViewportChange: MapOnMoveHandler = ({ lat, lon }) => {
  //   setViewport({ lat, lon });
  // };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { title } = values;
        const tripId = trip?.id;

        if (!tripId) return;

        setLoading((state) => ({ ...state, trip: true }));
        onLoading(true);

        // update the trip
        const { success } = await apiClient.updateTrip({
          query: { tripId },
          payload: { title },
        });

        if (success) {
          setLoading((state) => ({ ...state, trip: false }));
          onLoading(false);
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
                      onSubmit={(data) => {
                        // handleWaypointEditSubmit(id, data)
                      }}
                      onCancel={handleWaypointEditCancel}
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
                    // onDelete={handleWaypointDelete}
                  />
                ),
              )}
            </div>
          )}

          {waypointCreating && (
            <div className="w-full py-4">
              <TripWaypointCreateForm
                loading={loading.waypoint}
                lat={map?.center?.lat}
                lon={map?.center?.lon}
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
