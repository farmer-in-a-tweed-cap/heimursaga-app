'use client';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@repo/ui/components';
import { useEffect, useState } from 'react';

import { Map } from '@/components';
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

  const [map, setMap] = useState<{
    lat: number;
    lon: number;
    alt: number;
    marker?: {
      lat: number;
      lon: number;
    };
  }>({
    lat: coordinates?.lat,
    lon: coordinates?.lon,
    alt: coordinates?.alt,
  });

  const handleMapMove = (data: { lat: number; lon: number; alt: number }) => {
    const { lat, lon, alt } = data;

    setMap((map) => ({
      ...map,
      lat,
      lon,
      alt,
    }));
  };

  const handleMarkerChange = (marker: { lat: number; lon: number }) => {
    const { lat, lon } = marker;

    setMap((map) => ({
      ...map,
      lat,
      lon,
      marker: {
        lat,
        lon,
      },
    }));
  };

  const handleSubmit = () => {
    const { lat, lon, alt, marker } = map;
    if (onSubmit) {
      onSubmit({ lat, lon, alt, marker });
    }
  };

  return (
    <DialogContent full={true}>
      <DialogHeader>
        <DialogTitle>Location</DialogTitle>
        <DialogDescription>
          Select the location you want to attach to your post.
        </DialogDescription>
      </DialogHeader>
      <div className="w-full h-full flex items-center space-x-2 bg-gray-100">
        {mapbox.token && (
          <Map
            token={mapbox.token}
            marker={marker}
            coordinates={{
              lat: coordinates.lat,
              lon: coordinates.lon,
              alt: coordinates.alt,
            }}
            markerEnabled={true}
            onMove={handleMapMove}
            onMarkerChange={handleMarkerChange}
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
