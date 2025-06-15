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
  MAP_LAYERS,
  MAP_SOURCES,
  Map,
  MapSidebar,
  MapSourceData,
  MapTripCard,
  MapViewContainer,
  TripEditForm,
  TripWaypointCard,
  TripWaypointCardClickHandler,
  TripWaypointCreateForm,
  TripWaypointCreateFormSubmitHandler,
  TripWaypointEditForm,
  TripWaypointEditFormState,
} from '@/components';
import { useMap, useMapbox } from '@/hooks';
import { dateformat, sortByDate, zodMessage } from '@/lib';

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
};

export const TripEditView: React.FC<Props> = ({ trip }) => {
  const mapbox = useMapbox();
  const map = useMap({
    sidebar: true,
    bounds: {
      ne: { lat: 56.109059951256256, lon: 38.10823094563034 },
      sw: { lat: 55.25372511584288, lon: 37.174747411366155 },
    },
  });

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

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-row justify-between bg-white">
      <MapSidebar opened={map.sidebar} view={map.view}>
        {/* <div className="break-all text-xs">
          {JSON.stringify({
            center: map.center,
            zoom: map.zoom,
            bbx: map.bounds,
          })}
        </div> */}
        {trip && (
          <MapTripCard
            title={trip.title}
            startDate={trip.startDate}
            endDate={trip.endDate}
            // backUrl={ROUTER.HOME}
          />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const bounds = {
              ne: { lat: 56.109059951256256, lon: 38.10823094563034 },
              sw: { lat: 55.25372511584288, lon: 37.174747411366155 },
            };

            map.mapbox.updateBounds(bounds);
          }}
        >
          bounds
        </Button>
        <TripEditForm />
      </MapSidebar>
      <MapViewContainer
        extended={!map.sidebar}
        onExtend={map.handleSidebarToggle}
      >
        {mapbox.token && (
          <Map
            token={mapbox.token}
            marker={{
              lat: 48.74555174206296,
              lon: 6.6642343574329175,
            }}
            bounds={map.bounds}
            layers={[
              {
                id: MAP_LAYERS.WAYPOINTS,
                source: MAP_SOURCES.WAYPOINTS,
              },
              {
                id: MAP_LAYERS.WAYPOINT_LINES,
                source: MAP_SOURCES.WAYPOINT_LINES,
              },
            ]}
            sources={[
              {
                sourceId: MAP_SOURCES.WAYPOINTS,
                type: 'point',
                data: [
                  {
                    id: `1`,
                    lat: 47.713906575004074,
                    lon: 2.143926023187305,
                    properties: {},
                  },
                  {
                    id: `2`,
                    lat: 49.713906575004074,
                    lon: 2.143926023187305,
                    properties: {},
                  },
                  {
                    id: `3`,
                    lat: 50.713906575004074,
                    lon: 3.243926023187305,
                    properties: {},
                  },
                ],
              },
              {
                sourceId: MAP_SOURCES.WAYPOINT_LINES,
                type: 'line',
                data: [
                  {
                    id: `1`,
                    lat: 47.713906575004074,
                    lon: 2.143926023187305,
                    properties: {},
                  },
                  {
                    id: `2`,
                    lat: 49.713906575004074,
                    lon: 2.143926023187305,
                    properties: {},
                  },
                  {
                    id: `3`,
                    lat: 50.713906575004074,
                    lon: 3.243926023187305,
                    properties: {},
                  },
                ],
              },
            ]}
            onLoad={map.handleLoad}
            onMove={map.handleMove}
          />
        )}
      </MapViewContainer>
    </div>
  );
};
