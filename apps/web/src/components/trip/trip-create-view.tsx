'use client';

import { Button } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useState } from 'react';

import {
  Map,
  TripWaypointCard,
  TripWaypointCardClickHandler,
  TripWaypointCreateForm,
  TripWaypointCreateFormSubmitHandler,
  TripWaypointEditForm,
  TripWaypointEditFormState,
} from '@/components';
import { useMapbox } from '@/hooks';
import { array, toGeoJson } from '@/lib';

export const TripCreateView = () => {
  const mapbox = useMapbox();

  const [state, setState] = useState<{
    waypointCreating: boolean;
    waypointEditing: boolean;
    waypointEditingId?: string;
  }>({
    waypointCreating: false,
    waypointEditing: false,
  });

  const [waypoints, setWaypoints] = useState<
    {
      id: string;
      title: string;
      lat: number;
      lon: number;
    }[]
  >(
    array(5).map((_, key) => ({
      id: `${key}`,
      title: 'title',
      lat: 50.84 + key,
      lon: 4.3572 + key,
    })),
  );

  const { waypointCreating, waypointEditing, waypointEditingId } = state;

  const handleWaypointCreate = () => {
    setState((state) => ({ ...state, waypointCreating: true }));
  };

  const handleWaypointCreateSubmit: TripWaypointCreateFormSubmitHandler = (
    data,
  ) => {
    setState((state) => ({ ...state, waypointCreating: false }));

    setWaypoints((waypoints) => [
      ...waypoints,
      { ...data, id: `${waypoints.length + 1}` },
    ]);
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

  const handleWaypointEditSubmit = (
    id: string,
    data: Partial<TripWaypointEditFormState>,
  ) => {
    const waypointEditingId = state.waypointEditingId;

    setState((state) => ({
      ...state,
      waypointEditing: false,
      waypointEditingId: undefined,
    }));

    setWaypoints((waypoints) => {
      const waypointIndex = waypoints.findIndex(
        (el) => el.id === waypointEditingId,
      );

      console.log({ waypointIndex, waypoints });

      if (waypointIndex > -1) {
        const prev = waypoints[waypointIndex];
        waypoints[waypointIndex] = { ...prev, ...data };
      }

      return waypoints;
    });
  };

  const handleWaypointEditCancel = () => {
    setState((state) => ({
      ...state,
      waypointEditing: false,
      waypointEditingId: undefined,
    }));
  };

  const handleWaypointDelete: TripWaypointCardClickHandler = (id) => {
    setWaypoints((waypoints) => waypoints.filter((el) => el.id !== id));
  };

  const handleSubmit = () => {};

  return (
    <div className="w-full h-full flex flex-row justify-between bg-white">
      <div className="w-full relative h-full hidden sm:flex overflow-hidden">
        <div className="basis-4/12 relative flex flex-col h-full">
          <div className="relative flex flex-col justify-start items-start py-4 px-6 bg-white overflow-y-scroll">
            <div className="w-full flex flex-col gap-14 py-4 box-border">
              <div className="flex flex-col justify-start items-start gap-2">
                <h1 className="text-xl font-medium">Create a trip</h1>
                <span className="font-normal text-base text-gray-700">
                  Easily plan the perfect path for your next trip.
                </span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-medium">Waypoints</h2>
                <div className="mt-4 flex flex-col">
                  <div className="flex flex-col gap-2">
                    {waypoints.map(({ id, title, lat, lon }, key) =>
                      waypointEditingId === id ? (
                        <TripWaypointEditForm
                          key={key}
                          defaultValues={{ title, lat, lon }}
                          onSubmit={(data) =>
                            handleWaypointEditSubmit(id, data)
                          }
                          onCancel={handleWaypointEditCancel}
                        />
                      ) : (
                        <TripWaypointCard
                          key={key}
                          id={id}
                          orderIndex={key}
                          title={title}
                          lat={lat}
                          lon={lon}
                          onEdit={handleWaypointEdit}
                          onDelete={handleWaypointDelete}
                        />
                      ),
                    )}
                  </div>
                  <div>
                    {waypointCreating && (
                      <TripWaypointCreateForm
                        onSubmit={handleWaypointCreateSubmit}
                        onCancel={handleWaypointCreateCancel}
                      />
                    )}
                  </div>
                  {!waypointCreating && !waypointEditing && (
                    <div className="mt-6 flex flex-col">
                      <Button
                        variant="secondary"
                        onClick={handleWaypointCreate}
                      >
                        Add new waypoint
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="sticky bottom-0 left-0 right-0 flex flex-col bg-background py-4 box-border">
                <Button size="lg" onClick={handleSubmit}>
                  Save trip
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
                    source: 'waypoints',
                    data: waypoints.map(({ lat, lon }) => ({
                      lat,
                      lon,
                      properties: {},
                    })),
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
