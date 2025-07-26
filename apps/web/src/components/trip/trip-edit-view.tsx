'use client';

import { ITripDetail, IWaypoint } from '@repo/types';
import { Button } from '@repo/ui/components';
import { useState, useEffect } from 'react';

import {
  MAP_LAYERS,
  MAP_SOURCES,
  Map,
  MapSidebar,
  MapTripCard,
  MapViewContainer,
  TripEditForm,
} from '@/components';
import { MapWaypointValue, useMap, useMapbox, useScreen } from '@/hooks';
import { dateformat, sortByDate } from '@/lib';
import { apiClient } from '@/lib/api';
import { ROUTER } from '@/router';

const WAYPOINT_SORT_ORDER = 'asc';
const TRIP_EDIT_FORM_ID = 'trip_edit_form';

type Props = {
  trip?: ITripDetail;
  source?: 'map' | 'trip';
};

export const TripEditView: React.FC<Props> = ({ source, trip }) => {
  const mapbox = useMapbox();
  const screen = useScreen();
  const map = useMap({
    sidebar: true,
    bounds: {
      ne: { lat: 56.109059951256256, lon: 38.10823094563034 },
      sw: { lat: 55.25372511584288, lon: 37.174747411366155 },
    },
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [waypoint, setWaypoint] = useState<MapWaypointValue | null>(null);
  const [waypoints, setWaypoints] = useState<IWaypoint[]>(
    trip?.waypoints || [],
  );
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fit map bounds to show all waypoints when mounted or waypoints change
  useEffect(() => {
    if (isMounted && map.loaded && waypoints.length > 0 && map.mapbox) {
      const coordinates = waypoints.map(wp => [wp.lon, wp.lat]);
      
      if (coordinates.length === 1) {
        // Single point - center map on it
        map.mapbox.flyTo({
          center: [waypoints[0].lon, waypoints[0].lat],
          zoom: 14,
          duration: 1000
        });
      } else if (coordinates.length > 1) {
        // Multiple points - fit bounds to include all points
        const lats = coordinates.map(coord => coord[1]);
        const lons = coordinates.map(coord => coord[0]);
        
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        
        // Add padding to bounds
        const latPadding = (maxLat - minLat) * 0.1 || 0.01;
        const lonPadding = (maxLon - minLon) * 0.1 || 0.01;
        
        map.mapbox.fitBounds(
          [minLon - lonPadding, minLat - latPadding, maxLon + lonPadding, maxLat + latPadding],
          {
            duration: 1000,
            padding: 20
          }
        );
      }
    }
  }, [isMounted, map.loaded, waypoints, map.mapbox]);

  const backUrl = source
    ? source === 'trip'
      ? ROUTER.JOURNEYS.HOME
      : ROUTER.HOME
    : undefined;

  const handleWaypointMove = (waypoint: MapWaypointValue) => {
    setWaypoint(waypoint);
  };

  const handleWaypointEditStart = (waypointData: IWaypoint) => {
    // Set the waypoint as draggable on the map by setting it in the waypoint state
    setWaypoint({
      id: waypointData.id,
      lat: waypointData.lat,
      lon: waypointData.lon
    });
  };

  const handleWaypointEditCancel = () => {
    // Clear the draggable waypoint when editing is cancelled
    setWaypoint(null);
  };

  const handleWaypointEditSubmit = async (editedWaypoint: MapWaypointValue) => {
    // Clear the draggable waypoint when editing is submitted
    setWaypoint(null);
    
    try {
      // Save to database
      if (trip?.id) {
        await apiClient.updateTripWaypoint({
          query: {
            tripId: trip.id,
            waypointId: editedWaypoint.id
          },
          payload: {
            title: editedWaypoint.title,
            lat: editedWaypoint.lat,
            lon: editedWaypoint.lon,
            date: editedWaypoint.date
          }
        });
      }
      
      // Update the waypoint in the local state and re-sort by date
      setWaypoints(prev => {
        const updated = prev.map(wp => 
          wp.id === editedWaypoint.id 
            ? { 
                ...wp, 
                lat: editedWaypoint.lat, 
                lon: editedWaypoint.lon,
                title: editedWaypoint.title || wp.title,
                date: editedWaypoint.date || wp.date
              }
            : wp
        );
        
        // Re-sort waypoints by date to maintain chronological order
        return sortByDate({
          elements: updated,
          order: WAYPOINT_SORT_ORDER,
          key: 'date',
        });
      });
    } catch (error) {
      console.error('Failed to update waypoint:', error);
      // TODO: Show error toast to user
    }
  };

  const handleWaypointCreateStart = (waypoint: MapWaypointValue) => {
    const offset = 1;

    // check if there are any waypoints with the same coordinates
    const duplicated = waypoints.some(
      ({ lat, lon }) => lat === waypoint.lat && lon === waypoint.lon,
    );

    // update editable waypoint
    if (duplicated) {
      setWaypoint({
        ...waypoint,
        lat: waypoint.lat + offset,
        lon: waypoint.lon + offset,
      });
    } else {
      setWaypoint(waypoint);
    }
  };

  const handleWaypointCreateCancel = () => {
    setWaypoint(null);
  };

  const handleWaypointCreateSubmit = (waypoint: MapWaypointValue) => {
    // append waypoint
    setWaypoints((prev) => {
      // sort waypoints by date
      const sorted = sortByDate({
        elements: [...prev, waypoint],
        order: 'asc',
        key: 'date',
      });

      console.log({ waypoint, prev, sorted });

      return sorted;
    });

    // clear editable waypoint
    setWaypoint(null);
  };

  const handleWaypointDelete = (id: number) => {
    setWaypoints((waypoints) => {
      return waypoints.filter((waypoint) => waypoint.id !== id);
    });
  };

  const sidebarContent = (
    <>
      {trip && (
        <MapTripCard
          title={trip.title}
          startDate={trip.startDate}
          endDate={trip.endDate}
          backUrl={backUrl}
        />
      )}
      <div className="w-full h-full flex flex-col overflow-y-scroll">
        <div className="w-full h-auto px-6 py-4">
          <TripEditForm
            trip={trip}
            waypoint={waypoint}
            waypoints={waypoints}
            map={{ center: map.center }}
            onLoading={(loading: boolean) => setLoading(loading)}
            onWaypointCreateSubmit={handleWaypointCreateSubmit}
            onWaypointCreateStart={handleWaypointCreateStart}
            onWaypointCreateCancel={handleWaypointCreateCancel}
            onWaypointEditStart={handleWaypointEditStart}
            onWaypointEditCancel={handleWaypointEditCancel}
            onWaypointEditSubmit={handleWaypointEditSubmit}
            onWaypointDelete={handleWaypointDelete}
          />
        </div>
        <div className="sticky bottom-0 left-0 right-0 flex flex-col bg-background px-4 py-4 box-border">
          <Button
            size="lg"
            type="submit"
            form={TRIP_EDIT_FORM_ID}
            loading={loading}
          >
            Save changes
          </Button>
        </div>
      </div>
    </>
  );

  const mapContent = (
    <>
      {mapbox.token && (
        <Map
          token={mapbox.token}
          center={map.center}
          bounds={map.bounds}
          zoom={map.zoom}
          geocoder={true}
          layers={[
            {
              id: MAP_LAYERS.WAYPOINTS_DRAGGABLE,
              source: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
            },
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
              sourceId: MAP_SOURCES.WAYPOINTS_DRAGGABLE,
              type: 'point',
              data: waypoint
                ? [
                    {
                      id: waypoint.id,
                      lat: waypoint.lat,
                      lon: waypoint.lon,
                      properties: {},
                    },
                  ]
                : [],
            },
            {
              sourceId: MAP_SOURCES.WAYPOINTS,
              type: 'point',
              data: waypoints
                .filter(wp => waypoint ? wp.id !== waypoint.id : true) // Hide waypoint being edited
                .map(({ id, lat, lon, title, date }, key) => ({
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
            {
              sourceId: MAP_SOURCES.WAYPOINT_LINES,
              type: 'line',
              data: waypoints.map(({ id, lat, lon }) => ({
                id,
                lat: waypoint && waypoint.id === id ? waypoint.lat : lat, // Use dragged coordinates if editing
                lon: waypoint && waypoint.id === id ? waypoint.lon : lon, // Use dragged coordinates if editing
                properties: {},
              })),
            },
          ]}
          minZoom={3}
          onLoad={map.handleLoad}
          onMove={map.handleMove}
          onWaypointMove={handleWaypointMove}
        />
      )}
    </>
  );

  // Prevent hydration mismatch by only checking mobile after mount
  if (!isMounted) {
    // During SSR and initial hydration, always render desktop layout
    return (
      <div className="relative w-full h-full overflow-hidden flex flex-row justify-between bg-white">
        <MapSidebar opened={map.sidebar}>
          {sidebarContent}
        </MapSidebar>
        <MapViewContainer
          extended={!map.sidebar}
          onExtend={map.handleSidebarToggle}
        >
          {mapContent}
        </MapViewContainer>
      </div>
    );
  }

  if (screen.mobile) {
    // Mobile: Split layout - map on top, list on bottom
    return (
      <div className="relative w-full h-full overflow-hidden flex flex-col bg-white">
        {/* Map - Top Half */}
        <div className="w-full h-1/2 relative overflow-hidden">
          {mapContent}
        </div>
        
        {/* List - Bottom Half */}
        <div className="w-full h-1/2 flex flex-col overflow-hidden bg-white border-t border-gray-200">
          {sidebarContent}
        </div>
      </div>
    );
  }

  // Desktop: Side-by-side layout
  return (
    <div className="relative w-full h-full overflow-hidden flex flex-row justify-between bg-white">
      <MapSidebar opened={map.sidebar}>
        {sidebarContent}
      </MapSidebar>
      <MapViewContainer
        extended={!map.sidebar}
        onExtend={map.handleSidebarToggle}
      >
        {mapContent}
      </MapViewContainer>
    </div>
  );
};
