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
import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import {
  MAP_SOURCES,
  Map,
  MapOnMoveHandler,
  MapSourceData,
  TripWaypointCard,
  TripWaypointCardClickHandler,
  TripWaypointCreateForm,
  TripWaypointCreateFormSubmitHandler,
  TripWaypointEditForm,
  TripWaypointEditFormState,
} from '@/components';
import { useMapbox } from '@/hooks';
import { dateformat, sortByDate, zodMessage } from '@/lib';

type WaypointElement = {
  id: string;
  title: string;
  lat: number;
  lon: number;
  date: Date;
};

const FORM_ID = 'trip_edit_form';

const schema = z.object({
  title: z
    .string()
    .nonempty(zodMessage.required('title'))
    .min(0, zodMessage.string.min('title', 0))
    .max(100, zodMessage.string.max('title', 100)),
  description: z
    .string()
    .max(500, zodMessage.string.max('description', 500))
    .optional(),
});

type Props = {
  trip?: ITripDetail;
};

export const TripEditView: React.FC<Props> = ({ trip }) => {
  const mapbox = useMapbox();
  const router = useRouter();

  const [state, setState] = useState<{
    waypointCreating: boolean;
    waypointEditing: boolean;
    waypointEditingId?: string;
  }>({
    waypointCreating: false,
    waypointEditing: false,
  });

  const [loading, setLoading] = useState({
    trip: false,
    waypoint: false,
  });

  const [viewport, setViewport] = useState<{ lat: number; lon: number }>({
    lat: 0,
    lon: 0,
  });

  const [waypoints, setWaypoints] = useState<WaypointElement[]>(
    trip?.waypoints
      ? sortByDate(
          trip.waypoints.map(
            ({ id, title = '', date = new Date(), lat, lon }) => ({
              id: `${id}`,
              title,
              date: dateformat(date).toDate(),
              lat,
              lon,
            }),
          ),
          'asc',
        )
      : [],
  );

  const { waypointCreating, waypointEditing, waypointEditingId } = state;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: trip
      ? { title: trip.title, description: trip.description }
      : {
          title: '',
          description: '',
        },
  });

  const handleWaypointCreate = () => {
    setState((state) => ({ ...state, waypointCreating: true }));
  };

  const handleWaypointCreateSubmit: TripWaypointCreateFormSubmitHandler =
    async (data) => {
      try {
        setLoading((state) => ({ ...state, waypoint: true }));

        if (!trip?.id) return;

        const { date, title, lat, lon } = data;

        // create a point
        const { success } = await apiClient.createTripWaypoint({
          query: { tripId: trip.id },
          payload: { lat, lon, date, title },
        });

        if (success) {
          alert('waypoint created');

          setState((state) => ({ ...state, waypointCreating: false }));
          setLoading((state) => ({ ...state, waypoint: false }));
          setWaypoints((waypoints) =>
            sortByDate(
              [...waypoints, { ...data, id: `${waypoints.length + 1}` }],
              'asc',
            ),
          );
        } else {
          setLoading((state) => ({ ...state, waypoint: false }));
        }
      } catch (e) {
        setLoading((state) => ({ ...state, waypoint: false }));
      }
    };

  const handleWaypointCreateCancel = () => {
    setState((state) => ({ ...state, waypointCreating: false }));
  };

  const handleWaypointEdit: TripWaypointCardClickHandler = (id) => {
    setState((state) => ({
      ...state,
      waypointEditing: true,
      waypointEditingId: id,
    }));
  };

  const handleWaypointEditSubmit = async (
    id: string,
    data: Partial<TripWaypointEditFormState>,
  ) => {
    try {
      const waypointId = state.waypointEditingId
        ? parseInt(state.waypointEditingId)
        : undefined;
      const { lat, lon, date, title } = data;

      if (!trip?.id || !waypointId) return;

      setLoading((state) => ({ ...state, waypoint: true }));

      // update the waypoint
      const { success } = await apiClient.updateTripWaypoint({
        query: { tripId: trip.id, waypointId },
        payload: { lat, lon, date, title },
      });

      if (success) {
        setState((state) => ({
          ...state,
          waypointEditing: false,
          waypointEditingId: undefined,
        }));
        setWaypoints((waypoints) => {
          const waypointIndex = waypoints.findIndex(
            (el) => el.id === waypointEditingId,
          );
          if (waypointIndex > -1) {
            const prev = waypoints[waypointIndex];
            waypoints[waypointIndex] = { ...prev, ...data };
          }

          return sortByDate(waypoints, 'asc');
        });
        setLoading((state) => ({ ...state, waypoint: false }));
      } else {
        setLoading((state) => ({ ...state, waypoint: false }));
      }
    } catch (e) {
      setLoading((state) => ({ ...state, waypoint: false }));
    }
  };

  const handleWaypointEditCancel = () => {
    setState((state) => ({
      ...state,
      waypointEditing: false,
      waypointEditingId: undefined,
    }));
  };

  const handleWaypointDelete: TripWaypointCardClickHandler = async (id) => {
    if (confirm(`delete this waypoint?`)) {
      try {
        const waypointId = parseInt(id);

        if (!trip?.id || !waypointId) return;

        // delete the waypoint
        const { success } = await apiClient.deleteTripWaypoint({
          query: { tripId: trip.id, waypointId },
        });

        if (success) {
          setWaypoints((waypoints) => waypoints.filter((el) => el.id !== id));
        } else {
          //
        }
      } catch (e) {
        //
      }
    }
  };

  const handleViewportChange: MapOnMoveHandler = ({ lat, lon }) => {
    setViewport({ lat, lon });
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { title } = values;

        const tripId = trip?.id;
        if (!tripId) return;

        setLoading((state) => ({ ...state, trip: true }));

        // update the trip
        const { success } = await apiClient.updateTrip({
          query: { tripId },
          payload: { title },
        });

        if (success) {
          setLoading((state) => ({ ...state, trip: false }));
        } else {
          setLoading((state) => ({ ...state, trip: false }));
        }
      } catch (e) {
        setLoading((state) => ({ ...state, trip: false }));
      }
    },
  );

  return (
    <div className="w-full h-full flex flex-row justify-between bg-white">
      <div className="w-full relative h-full hidden sm:flex overflow-hidden">
        <div className="basis-4/12 relative flex flex-col h-dvh">
          <div className="relative h-full flex flex-col justify-start items-start px-6 bg-white overflow-y-scroll">
            <div className="w-full h-full flex flex-col justify-between gap-10 box-border">
              <div className="flex flex-col gap-10">
                <div className="flex flex-col justify-start pt-6 items-start gap-2">
                  <h1 className="text-xl font-medium">Edit trip</h1>
                  <span className="font-normal text-base text-gray-700">
                    Easily plan the perfect path for your next trip.
                  </span>
                </div>
                <div className="flex flex-col">
                  {/* <span className="text-xs">
                  {JSON.stringify({ v: viewport })}
                </span> */}
                  <h2 className="text-xl font-medium">Trip</h2>
                  <div className="mt-6 flex flex-col gap-6">
                    <Form {...form}>
                      <form id={FORM_ID} onSubmit={handleSubmit}>
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
                  </div>
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xl font-medium">Waypoints</h2>
                  <div className="mt-4 flex flex-col">
                    <div className="flex flex-col gap-2">
                      {waypoints.map(({ id, title, lat, lon, date }, key) =>
                        waypointEditingId === id ? (
                          <div
                            key={key}
                            className="py-4 border-b border-solid border-accent"
                          >
                            <TripWaypointEditForm
                              defaultValues={{ title, lat, lon, date }}
                              loading={loading.waypoint}
                              onSubmit={(data) =>
                                handleWaypointEditSubmit(id, data)
                              }
                              onCancel={handleWaypointEditCancel}
                            />
                          </div>
                        ) : (
                          <TripWaypointCard
                            key={key + 1}
                            id={id}
                            orderIndex={key + 1}
                            title={title}
                            lat={lat}
                            lon={lon}
                            date={date}
                            onEdit={handleWaypointEdit}
                            onDelete={handleWaypointDelete}
                          />
                        ),
                      )}
                    </div>
                    {waypointCreating && (
                      <div className="py-4 border-b border-solid border-accent">
                        <TripWaypointCreateForm
                          loading={loading.waypoint}
                          defaultProps={{
                            lat: viewport.lat,
                            lon: viewport.lon,
                          }}
                          onSubmit={handleWaypointCreateSubmit}
                          onCancel={handleWaypointCreateCancel}
                        />
                      </div>
                    )}
                    {!waypointCreating && !waypointEditing && (
                      <div className="mt-6 flex flex-col">
                        <Button
                          variant="secondary"
                          onClick={handleWaypointCreate}
                        >
                          Add waypoint
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 left-0 right-0 flex flex-col bg-background py-4 box-border">
                <Button
                  size="lg"
                  type="submit"
                  form={FORM_ID}
                  loading={loading.trip}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'basis-8/12 z-40 relative overflow-hidden rounded-l-2xl',
          )}
        >
          <div className={cn('z-10 relative !w-full h-full overflow-hidden')}>
            {mapbox.token && (
              <Map
                token={mapbox.token}
                sources={[
                  {
                    sourceId: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
                    type: 'point',
                    data: waypoints.map(
                      ({ id, title, date, lat, lon }, key) => ({
                        id,
                        lat,
                        lon,
                        properties: {
                          index: key + 1,
                          id,
                          title,
                          date,
                        },
                      }),
                    ),
                    config: {
                      cluster: false,
                    },
                    onChange: (
                      data: MapSourceData<{ title: string; date: Date }>[],
                    ) => {
                      setWaypoints(
                        data.map(({ id, lat, lon, properties }) => ({
                          id: `${id}`,
                          lat,
                          lon,
                          title: properties.title,
                          date: properties.date,
                        })),
                      );
                    },
                  },
                  {
                    sourceId: MAP_SOURCES.TRIPS,
                    type: 'line',
                    data: waypoints.map(({ id, lat, lon }) => ({
                      id: `${id}`,
                      lat,
                      lon,
                      properties: {},
                    })),
                  },
                ]}
                onLoad={({ viewport }) =>
                  handleViewportChange({
                    lat: viewport.lat,
                    lon: viewport.lon,
                    alt: 0,
                  })
                }
                onMove={handleViewportChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
