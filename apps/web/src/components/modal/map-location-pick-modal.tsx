'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
import { useState } from 'react';

import { sleep } from '@/lib/utils';

import { Map } from '@/components';
import { useMapbox } from '@/hooks';

import { ModalBaseProps } from './modal-provider';

export type MapLocationPickModalProps = {
  lat: number;
  lon: number;
  alt: number;
  marker?: {
    lat: number;
    lon: number;
  };
};

export type MapLocationPickModalOnSubmitHandler = (data: {
  lat: number;
  lon: number;
  alt: number;
  marker?: {
    lat: number;
    lon: number;
  };
}) => void;

const MapLocationPickModal: React.FC<
  ModalBaseProps<MapLocationPickModalProps>
> = ({ props, close, onSubmit, onCancel }) => {
  const { lat, lon, alt, marker } = props || {};

  const mapbox = useMapbox();

  const [map, setMap] = useState<{
    lat?: number;
    lon?: number;
    alt?: number;
    marker?: { lat: number; lon: number };
  }>({
    lat,
    lon,
    alt,
    marker:
      marker?.lat && marker?.lon
        ? { lat: marker.lat, lon: marker.lon }
        : undefined,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const { lat = 0, lon = 0, alt = 0, marker } = map;

    const handler = onSubmit as MapLocationPickModalOnSubmitHandler;

    if (handler) {
      setLoading(true);
      handler({ lat, lon, alt, marker });
      await sleep(500);
      close();
    }
  };

  const handleMapMove = (data: { lat: number; lon: number; alt: number }) => {
    const { lat, lon, alt } = data;

    setMap((map) => ({
      ...map,
      lat,
      lon,
      alt,
    }));
  };

  const handleMapMarkerChange = (marker: { lat: number; lon: number }) => {
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

  const handleCancel = () => {
    close();
    if (onCancel) {
      onCancel();
    }
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Pick location</DialogTitle>
      </DialogHeader>
      <div className="relative w-full h-full flex items-center rounded-lg overflow-hidden">
        {mapbox.token && (
          <Map
            token={mapbox.token}
            marker={
              map?.marker?.lat && map?.marker?.lon
                ? {
                    lat: map?.marker?.lat,
                    lon: map?.marker?.lon,
                  }
                : undefined
            }
            coordinates={
              map?.lat && map?.lon && map?.alt
                ? {
                    lat: map?.lat,
                    lon: map?.lon,
                    alt: map?.alt,
                  }
                : undefined
            }
            markerEnabled={true}
            onMove={handleMapMove}
            onMarkerChange={handleMapMarkerChange}
          />
        )}
        {/* <div className="absolute z-50 bottom-2 right-2 bg-white text-black">
          <span className="text-xs">{JSON.stringify({ map })}</span>
        </div> */}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleCancel}>
          Discard
        </Button>
        <Button loading={loading} onClick={handleSubmit}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
};

export default MapLocationPickModal;
