'use client';

import { BackButton } from '../button';
import {
  MAP_LAYERS,
  MAP_SOURCES,
  Map,
  MapOnSourceClickHandler,
  MapSidebar,
  MapViewContainer,
} from '../map-ui';
import { PostCard } from '../post';
import { ITripDetail } from '@repo/types';
import { useEffect, useState } from 'react';

import { useMapbox } from '@/hooks';
import { ROUTER } from '@/router';

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
        {trip && (
          <div className="sticky top-0 left-0 right-0 w-full">
            <MapTripCard
              title={trip.title}
              startDate={trip.startDate}
              endDate={trip.endDate}
              backUrl={ROUTER.HOME}
            />
          </div>
        )}
        <div className="w-full h-full flex flex-col justify-start items-start gap-4 box-border p-4 overflow-y-scroll">
          {trip?.waypoints
            ?.filter(({ post }) => !!post?.id)
            ?.map(({ post }, key) => (
              <PostCard
                key={key}
                id={post?.id}
                title={post?.title}
                content={post?.content}
                date={post?.date}
                author={post?.author}
                actions={{ like: false, bookmark: true }}
              />
            ))}
        </div>
      </MapSidebar>
      <MapViewContainer extended={!sidebar} onExtend={handleSidebarToggle}>
        {mapbox.token && (
          <Map
            token={mapbox.token}
            layers={[
              {
                id: MAP_LAYERS.WAYPOINT_LINES,
                source: MAP_SOURCES.WAYPOINT_LINES,
              },
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
                sourceId: MAP_SOURCES.WAYPOINTS,
                type: 'point',
                data: waypoints.map(({ id, title, date, lat, lon }, key) => ({
                  id,
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
              {
                sourceId: MAP_SOURCES.WAYPOINT_LINES,
                type: 'line',
                data: waypoints.map(({ id, title, date, lat, lon }, key) => ({
                  id,
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
              //   sourceId: MAP_SOURCES.WAYPOINTS,
              //   type: 'point',
              //   data: waypoints.map(({ id, lat, lon }) => ({
              //     id: `${id}`,
              //     lat,
              //     lon,
              //     properties: {},
              //   })),
              // },
              // {
              //   sourceId: MAP_SOURCES.TRIP_WAYPOINT_ORDER_NUMBERS,
              //   type: 'point',
              //   data: waypoints.map(({ id, lat, lon }) => ({
              //     id: `${id}`,
              //     lat,
              //     lon,
              //     properties: {},
              //   })),
              // },
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

export const MapTripCard: React.FC<{
  title: string;
  startDate?: Date;
  endDate?: Date;
  backUrl?: string;
  onBack?: () => void;
}> = ({ title, backUrl, onBack }) => {
  return (
    <div className="flex flex-row items-center justify-start box-border p-4 gap-4">
      <div className="">
        <BackButton href={backUrl} onClick={onBack} />
      </div>
      <div>
        <h1 className="text-lg font-medium">{title}</h1>
      </div>
    </div>
  );
};
