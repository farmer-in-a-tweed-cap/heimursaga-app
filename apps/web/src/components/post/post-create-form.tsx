'use client';

import { Button, Dialog, DialogTrigger } from '@repo/ui/components';
import { useState } from 'react';

import { MapDialog } from '@/components/dialog';

import { Map } from '@/components';
import { useMapbox } from '@/hooks/use-mapbox';

export const PostCreateForm = () => {
  const mapbox = useMapbox();

  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
    alt: number;
    marker?: {
      lat: number;
      lon: number;
    };
  }>({
    lat: 48,
    lon: 17,
    alt: 5,
  });

  const handleLocationChange = (location: {
    lat: number;
    lon: number;
    alt: number;
    marker?: {
      lat: number;
      lon: number;
    };
  }) => {
    const { lat, lon, alt, marker } = location;
    console.log('location:', { lat, lon, alt, marker });

    setLocation((location) => ({
      ...location,
      lat,
      lon,
      alt,
      marker,
    }));
  };

  return (
    <div className="mt-4 flex flex-col">
      <div className="flex flex-col gap-4">
        <div>
          <Dialog>
            <DialogTrigger asChild>
              {mapbox.token && (
                <div className="relative w-full aspect-5/2 rounded-xl overflow-hidden">
                  <div className="absolute z-20 transition-all inset-0 w-full h-full flex flex-row justify-center items-center opacity-0 cursor-pointer hover:opacity-100">
                    <div className="absolute z-10 inset-0 bg-gray-200 opacity-50"></div>
                    <Button variant="outline" className="z-20">
                      Open map
                    </Button>
                  </div>
                  <Map
                    token={mapbox.token}
                    marker={location.marker}
                    coordinates={{
                      lat: location.lat,
                      lon: location.lon,
                      alt: location.alt,
                    }}
                    sources={[]}
                    cursor="pointer"
                    controls={false}
                    disabled={true}
                    className="z-10"
                  />
                </div>
              )}
            </DialogTrigger>
            <MapDialog
              marker={location.marker}
              coordinates={{
                lat: location.lat,
                lon: location.lon,
                alt: location.alt,
              }}
              onSubmit={handleLocationChange}
            />
          </Dialog>
        </div>
      </div>
    </div>
  );
};
