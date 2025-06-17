'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ITripDetail, IWaypoint } from '@repo/types';
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
  MAP_LAYERS,
  MAP_SOURCES,
  Map,
  MapSidebar,
  MapTripCard,
  MapViewContainer,
  TRIP_EDIT_FORM_ID,
  TripEditForm,
  TripEditFormWaypointAddHandler,
} from '@/components';
import { MapCoordinatesValue, useMap, useMapbox } from '@/hooks';
import { zodMessage } from '@/lib';
import { ROUTER } from '@/router';

type WaypointElement = {
  id: number;
  title: string;
  lat: number;
  lon: number;
  date: Date;
  post?: {
    id: string;
  };
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
  source?: 'map' | 'trip';
};

export const TripEditView: React.FC<Props> = ({ source, trip }) => {
  const mapbox = useMapbox();
  const map = useMap({
    sidebar: true,
    bounds: {
      ne: { lat: 56.109059951256256, lon: 38.10823094563034 },
      sw: { lat: 55.25372511584288, lon: 37.174747411366155 },
    },
  });

  const [loading, setLoading] = useState<boolean>(false);

  const [waypoint, setWaypoint] = useState<MapCoordinatesValue | null>(null);
  const [waypoints, setWaypoints] = useState<IWaypoint[]>(
    trip?.waypoints || [],
  );
  const [waypointIndex, setWaypointIndex] = useState<number>(
    waypoints.length || 1,
  );

  const backUrl = source
    ? source === 'trip'
      ? ROUTER.JOURNEYS.HOME
      : ROUTER.HOME
    : undefined;

  // const [state, setState] = useState<{
  //   waypointCreating: boolean;
  //   waypointEditing: boolean;
  //   waypointEditingId?: number;
  // }>({
  //   waypointCreating: false,
  //   waypointEditing: false,
  // });

  // const [loading, setLoading] = useState({
  //   trip: false,
  //   waypoint: false,
  // });

  // const [viewport, setViewport] = useState<{ lat: number; lon: number }>({
  //   lat: 0,
  //   lon: 0,
  // });

  // const [waypoints, setWaypoints] = useState<WaypointElement[]>(
  //   trip?.waypoints
  //     ? sortByDate(
  //         trip.waypoints.map(
  //           ({ id, title = '', date = new Date(), lat, lon, post }) => ({
  //             id,
  //             title,
  //             date: dateformat(date).toDate(),
  //             lat,
  //             lon,
  //             post,
  //           }),
  //         ),
  //         'asc',
  //       )
  //     : [],
  // );

  // const [waypointEditing, setWaypointEditing] = useState<WaypointElement>();

  // const { waypointCreating, waypointEditingId } = state;

  // const form = useForm<z.infer<typeof schema>>({
  //   resolver: zodResolver(schema),
  //   defaultValues: trip
  //     ? { title: trip.title, description: trip.description }
  //     : {
  //         title: '',
  //         description: '',
  //       },
  // });

  const handleWaypointCreateStart: TripEditFormWaypointAddHandler = (
    waypoint,
  ) => {
    setWaypoint(waypoint);
  };

  const handleWaypointCreateCancel = () => {
    setWaypoint(null);
  };

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-row justify-between bg-white">
      <MapSidebar opened={map.sidebar} view={map.view}>
        {trip && (
          <MapTripCard
            title={trip.title}
            startDate={trip.startDate}
            endDate={trip.endDate}
            backUrl={backUrl}
          />
        )}
        <div className="w-full h-full flex flex-col overflow-y-scroll">
          <div className="w-full h-full px-6">
            {JSON.stringify({ center: map.center, waypoint })}
            <TripEditForm
              trip={trip}
              map={{ center: map.center }}
              onLoading={(loading: boolean) => setLoading(loading)}
              onWaypointCreateStart={handleWaypointCreateStart}
              onWaypointCreateCancel={handleWaypointCreateCancel}
            />
          </div>
          {/* <div className="sticky bottom-0 left-0 right-0 flex flex-col bg-background px-4 py-4 box-border">
            <Button
              size="lg"
              type="submit"
              form={TRIP_EDIT_FORM_ID}
              loading={loading}
            >
              Save changes
            </Button>
          </div> */}
        </div>
      </MapSidebar>
      <MapViewContainer
        extended={!map.sidebar}
        onExtend={map.handleSidebarToggle}
      >
        {mapbox.token && (
          <Map
            token={mapbox.token}
            layers={[
              {
                id: MAP_LAYERS.WAYPOINTS_DRAGGABLE,
                source: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
              },
              {
                id: MAP_LAYERS.WAYPOINTS_DRAGGABLE,
                source: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
              },
              // {
              //   id: MAP_LAYERS.WAYPOINT_LINES,
              //   source: MAP_SOURCES.WAYPOINT_LINES,
              // },
              {
                id: MAP_LAYERS.WAYPOINTS,
                source: MAP_SOURCES.WAYPOINTS,
              },
              {
                id: MAP_LAYERS.WAYPOINT_ORDER_NUMBERS,
                source: MAP_SOURCES.WAYPOINTS,
              },
            ]}
            sources={[
              {
                sourceId: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
                type: 'point',
                data: waypoint
                  ? [
                      {
                        id: `${Date.now()}`,
                        lat: waypoint.lat,
                        lon: waypoint.lon,
                        properties: {
                          index: waypointIndex,
                        },
                      },
                    ]
                  : [],
              },
              {
                sourceId: MAP_SOURCES.WAYPOINTS,
                type: 'point',
                data: waypoints.map(({ id, lat, lon, title, date }, key) => ({
                  id: `${id}`,
                  lat,
                  lon,
                  properties: {
                    index: key + 1,
                    id,
                    title,
                    date,
                  },
                })),
              },
              // {
              //   sourceId: MAP_SOURCES.WAYPOINT_LINES,
              //   type: 'line',
              //   data: waypoints.map(({ id, lat, lon }) => ({
              //     id: `${id}`,
              //     lat,
              //     lon,
              //     properties: {},
              //   })),
              // },
            ]}
            onLoad={map.handleLoad}
            onMove={map.handleMove}
            onWaypointDrag={(waypoint) => {
              setWaypoint(waypoint);
            }}
          />
        )}
      </MapViewContainer>
    </div>
  );
};
