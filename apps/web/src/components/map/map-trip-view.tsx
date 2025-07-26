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
import { UserBar } from '../user';
import { ITripDetail } from '@repo/types';
import { LoadingSpinner, Skeleton } from '@repo/ui/components';
import { useEffect, useState } from 'react';

import { useMapbox } from '@/hooks';
import { dateformat } from '@/lib';
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
  loading?: boolean;
  onBack?: () => void;
  author?: {
    username?: string;
    picture?: string;
    creator?: boolean;
  };
}> = ({ title, startDate, endDate, loading = false, backUrl, onBack, author }) => {
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return dateformat(date).format('MMM DD, YYYY');
  };

  const getDateRange = () => {
    if (startDate || endDate) {
      const start = formatDate(startDate);
      const end = formatDate(endDate);
      if (start && end) {
        return `${start} - ${end}`;
      } else if (start) {
        return start;
      } else if (end) {
        return end;
      }
    }
    return '';
  };

  return (
    <div className="relative box-border p-4">
      {/* Back button positioned absolutely */}
      <div className="absolute left-4 top-4">
        <BackButton href={backUrl} onClick={onBack} />
      </div>
      
      {/* Centered content */}
      <div className="flex flex-col items-center justify-center text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-[80px] h-[16px]" />
            <div className="h-4" />
            <Skeleton className="w-[120px] h-[20px]" />
            <Skeleton className="w-[100px] h-[16px]" />
          </div>
        ) : (
          <>
            {/* Author information */}
            {author && (
              <>
                <img 
                  src={author.picture || '/default-avatar.png'} 
                  alt={author.username}
                  className={`w-10 h-10 rounded-full object-cover border-2 border-solid ${author.creator ? 'border-primary' : 'border-transparent'}`}
                />
                <span className="text-sm font-medium mt-2">{author.username}</span>
                <div className="h-4" />
              </>
            )}
            
            {/* Journey title and date */}
            <h1 className="text-lg font-medium">{title}</h1>
            {getDateRange() && (
              <p className="text-sm text-gray-600 mt-1">{getDateRange()}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
