import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { MapLayout } from '@/app/layout';

import { MapTripView, PageNotFound } from '@/components';

type Props = {
  params: {
    trip_id: string;
  };
};

export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const tripId = params.trip_id;
  const cookie = cookies().toString();

  const trip = await apiClient
    .getTripById({ query: { tripId } }, { cookie })
    .then(({ data }) => data);

  return {
    title: trip ? `${trip.title}` : 'Journey',
  };
};

export default async function Page({ params }: Props) {
  const cookie = cookies().toString();
  const tripId = params.trip_id;

  const trip = await apiClient
    .getTripById({ query: { tripId } }, { cookie })
    .then(({ data }) => data);

  return (
    <MapLayout secure={false}>
      <div className="w-full h-full flex flex-col justify-start items-center">
        {trip ? <MapTripView trip={trip} /> : <PageNotFound />}
      </div>
    </MapLayout>
  );
}
