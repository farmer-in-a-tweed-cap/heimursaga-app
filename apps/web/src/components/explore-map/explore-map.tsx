import { ExploreSidebar, Map } from '@/components';

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

type Props = {
  className?: string;
};

export const ExploreMap: React.FC<Props> = () => {
  const token = MAPBOX_ACCESS_TOKEN;

  return (
    <div className="relative h-full">
      <div className="absolute top-0 left-0 bottom-0 z-20 w-[490px] h-full p-5">
        <ExploreSidebar />
      </div>
      <div className="relative w-full h-full z-10">
        {token && <Map token={MAPBOX_ACCESS_TOKEN || ''} />}
      </div>
    </div>
  );
};
