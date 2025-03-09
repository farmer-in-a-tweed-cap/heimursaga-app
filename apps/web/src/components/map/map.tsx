import { cn } from '@repo/ui/lib/utils';

import { Mapbox } from './mapbox';

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

type Props = {
  className?: string;
};

export const Map: React.FC<Props> = ({ className }) => {
  const token = MAPBOX_ACCESS_TOKEN;

  return (
    <div className={cn(className, 'w-full min-h-[240px]')}>
      {token && <Mapbox token={MAPBOX_ACCESS_TOKEN || ''} />}
    </div>
  );
};
