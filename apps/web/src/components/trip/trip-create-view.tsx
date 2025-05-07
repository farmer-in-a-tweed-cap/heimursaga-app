'use client';

import { cn } from '@repo/ui/lib/utils';

import { Map } from '@/components';
import { useMapbox } from '@/hooks';

export const TripCreateView = () => {
  const mapbox = useMapbox();

  return (
    <div className="w-full h-full flex flex-row justify-between bg-white">
      <div className="w-full relative h-full hidden sm:flex overflow-hidden">
        <div className="basis-5/12 relative flex flex-col h-full">
          <div className="flex flex-row justify-between items-center py-4 px-6 bg-white">
            <div className="w-full flex flex-col gap-4 overflow-y-scroll no-scrollbar py-4 box-border">
              <h2 className="text-lg font-medium">Create trip</h2>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'basis-7/12 z-40 relative overflow-hidden rounded-l-2xl',
          )}
        >
          <div className={cn('z-10 relative !w-full h-full overflow-hidden')}>
            {mapbox.token && <Map token={mapbox.token} />}
          </div>
        </div>
      </div>
    </div>
  );
};
