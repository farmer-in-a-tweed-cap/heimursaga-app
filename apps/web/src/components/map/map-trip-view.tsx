'use client';

import {
  MAP_SOURCES,
  Map,
  MapOnSourceClickHandler,
  MapSidebar,
  MapViewContainer,
} from '../map-ui';
import { ITripDetail } from '@repo/types';
import { useEffect, useState } from 'react';

import { useMapbox } from '@/hooks';

type Props = {
  trip?: ITripDetail;
};

export const MapTripView: React.FC<Props> = ({ trip }) => {
  const mapbox = useMapbox();

  const [sidebar, setSidebar] = useState<boolean>(true);
  const [waypoints, setWayponts] = useState<
    { id: number; lon: number; lat: number; title?: string; date?: Date }[]
  >(trip?.waypoints || []);

  const handleSidebarToggle = () => {
    setSidebar((prev) => !prev);
  };

  const handleWaypointClick: MapOnSourceClickHandler = (waypointId) => {
    alert(waypointId);
  };

  useEffect(() => {
    if (trip?.waypoints) {
      setWayponts(
        trip.waypoints.map(({ id, lon, lat }) => ({
          id,
          lon,
          lat,
          title: '',
          date: new Date(),
        })),
      );
    }
  }, [trip]);

  return (
    <div className="relative w-full h-dvh overflow-hidden flex flex-row justify-between bg-white">
      <MapSidebar opened={sidebar}>
        <div className="text-xs">{JSON.stringify({ trip })}</div>
      </MapSidebar>
      <MapViewContainer extended={!sidebar} onExtend={handleSidebarToggle}>
        {mapbox.token && (
          <Map
            token={mapbox.token}
            sources={[
              // {
              //   sourceId: MAP_SOURCES.TRIP_WAYPOINTS,
              //   type: 'line',
              //   data: waypoints.map(({ id, lat, lon }) => ({
              //     id: `${id}`,
              //     lat,
              //     lon,
              //     properties: {},
              //   })),
              // },
              {
                sourceId: MAP_SOURCES.TRIP_WAYPOINTS,
                type: 'point',
                data: waypoints.map(({ id, title, date, lat, lon }, key) => ({
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
                config: {
                  cluster: false,
                },
              },
            ]}
            // coordinates={{
            //   lat: map.lat,
            //   lon: map.lon,
            //   alt: map.alt,
            // }}
            // bounds={[
            //   map.bounds.sw.lon,
            //   map.bounds.sw.lat,
            //   map.bounds.ne.lon,
            //   map.bounds.ne.lat,
            // ]}
            // minZoom={1}
            // maxZoom={15}
            // sources={[
            //   {
            //     sourceId: MAP_SOURCES.WAYPOINTS,
            //     type: 'point',
            //     data: waypoints.map(({ lat, lon, post }, key) => ({
            //       id: `${key}`,
            //       lat,
            //       lon,
            //       properties: post
            //         ? {
            //             id: post.id,
            //             title: post.title,
            //             content: post.content,
            //             // date: post.date,
            //           }
            //         : {},
            //     })),
            //     config: {
            //       cluster: true,
            //     },
            //   },
            // ]}
            onSourceClick={handleWaypointClick}
            // onLoad={handleMapLoad}
            // onMove={handleMapMove}
          />
        )}
      </MapViewContainer>
    </div>
  );
};
