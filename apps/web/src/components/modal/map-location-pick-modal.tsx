'use client';

import {
  Button,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
import { useState } from 'react';

import { Map } from '@/components';
import { MapCoordinatesValue, useMap, useMapbox } from '@/hooks';
import { sleep } from '@/lib';

import { ModalBaseProps } from './modal-provider';

type MapLocationPickModalState = {
  center: MapCoordinatesValue;
  zoom: number;
  marker?: MapCoordinatesValue;
};

export type MapLocationPickModalProps = MapLocationPickModalState;

export type MapLocationPickModalOnSubmitHandler = (
  data: MapLocationPickModalState,
) => void;

const MapLocationPickModal: React.FC<
  ModalBaseProps<MapLocationPickModalProps>
> = ({ props, close, onSubmit, onCancel }) => {
  const { center, marker, zoom } = props || {};

  const mapbox = useMapbox();
  const map = useMap({ center, marker, zoom });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const { center, zoom, marker } = map;

    const handler = onSubmit as MapLocationPickModalOnSubmitHandler;

    if (handler) {
      setLoading(true);
      handler({ center, zoom, marker });
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
            zoom={map.zoom}
            markerEnabled={true}
            onMove={map.handleMove}
            onMarkerChange={map.handleMarkerChange}
          />
        )}
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
