'use client';

import { useQuery } from '@tanstack/react-query';

import { getPostsQuery } from '@/lib/api';

import { ExploreSidebar, Map } from '@/components';
import { useMapbox } from '@/hooks';

type Props = {
  className?: string;
};

export const ExploreMap: React.FC<Props> = () => {
  const mapbox = useMapbox();

  const postQuery = useQuery({
    queryKey: getPostsQuery.queryKey,
    queryFn: () => getPostsQuery.queryFn(),
  });

  const sources = postQuery.data
    ? postQuery.data?.data
        ?.filter((post) => post.id && post.lat && post.lon)
        .map(({ id, lat, lon }) => ({ id, lat, lon }))
    : [];

  return (
    <div className="relative h-full">
      <div className="absolute top-0 left-0 bottom-0 z-20 w-[490px] h-full p-5">
        <ExploreSidebar />
      </div>
      <div className="relative w-full h-full z-10">
        {mapbox.token && <Map token={mapbox.token} sources={sources} />}
      </div>
    </div>
  );
};
