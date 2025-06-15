'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
import { useState } from 'react';

import { Map } from '@/components';
import { useMap, useMapbox } from '@/hooks';
import { sleep } from '@/lib';

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
  const { lat = 0, lon = 0, alt = 0, marker } = props || {};

  const mapbox = useMapbox();
  const map = useMap({ center: { lat, lon }, zoom: alt, marker });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const { center, zoom, marker } = map;

    const handler = onSubmit as MapLocationPickModalOnSubmitHandler;

    if (handler) {
      setLoading(true);
      handler({ lat: center.lat, lon: center.lon, alt: zoom, marker });
      await sleep(500);
      close();
    }
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
            marker={map.marker}
            center={map.center}
            markerEnabled={true}
            onMove={map.handleMove}
            onMarkerChange={map.handleMarkerChange}
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
