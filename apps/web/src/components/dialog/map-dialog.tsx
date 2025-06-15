'use client';

import {
  Button,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
import { useState } from 'react';

import { Map } from '@/components';
import { useMap } from '@/hooks';
import { useMapbox } from '@/hooks/use-mapbox';

type Props = {
  coordinates?: {
    lat: number;
    lon: number;
    alt: number;
  };
  marker?: {
    lat: number;
    lon: number;
  };
  onSubmit?: (data: {
    lat: number;
    lon: number;
    alt: number;
    marker?: {
      lat: number;
      lon: number;
    };
  }) => void;
};

export const MapDialog: React.FC<Props> = ({
  marker,
  coordinates = {
    lat: 0,
    lon: 0,
    alt: 0,
  },
  onSubmit,
}) => {
  const mapbox = useMapbox();

  const map = useMap({
    center: {
      lat: coordinates?.lat,
      lon: coordinates?.lon,
    },
    zoom: coordinates?.alt,
  });

  // const [map, setMap] = useState<{
  //   lat: number;
  //   lon: number;
  //   alt: number;
  //   marker?: {
  //     lat: number;
  //     lon: number;
  //   };
  // }>({
  //   lat: coordinates?.lat,
  //   lon: coordinates?.lon,
  //   alt: coordinates?.alt,
  // });

  // const handleMapMove = (data: { lat: number; lon: number; alt: number }) => {
  //   const { lat, lon, alt } = data;

  //   setMap((map) => ({
  //     ...map,
  //     lat,
  //     lon,
  //     alt,
  //   }));
  // };

  // const handleMarkerChange = (marker: { lat: number; lon: number }) => {
  //   const { lat, lon } = marker;

  //   setMap((map) => ({
  //     ...map,
  //     lat,
  //     lon,
  //     marker: {
  //       lat,
  //       lon,
  //     },
  //   }));
  // };

  const handleSubmit = () => {
    const {
      center: { lat, lon },
      zoom,
    } = map;

    if (onSubmit) {
      onSubmit({ lat, lon, alt: zoom, marker });
    }
  };

  return (
    <DialogContent full={true}>
      <DialogHeader>
        <DialogTitle>Location</DialogTitle>
        <DialogDescription>Select location</DialogDescription>
      </DialogHeader>
      <div className="w-full h-full flex items-center space-x-2 bg-accent">
        {mapbox.token && (
          <Map
            token={mapbox.token}
            marker={marker}
            center={map.center}
            markerEnabled={true}
            onLoad={map.handleLoad}
            onMove={map.handleMove}
            onMarkerChange={map.handleMarkerChange}
          />
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button onClick={handleSubmit}>Save location</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};
