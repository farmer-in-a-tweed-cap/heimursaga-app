import { Metadata } from 'next';
import { cookies } from 'next/headers';

import { apiClient } from '@/lib/api';

import { MapLayout } from '@/app/layout';

import {
  PageNotFound,
  PageNotFoundFull,
  TripCreateView,
  TripEditView,
} from '@/components';

export const metadata: Metadata = {
  title: 'Edit trip',
};

type PageProps = {
  params: {
    id: string;
  };
};

export default async function Page({ params }: PageProps) {
  const cookie = await cookies().toString();

  const tripQuery = await apiClient.getTripById(
    { query: { tripId: params.id } },
    { cookie },
  );

  return (
    <MapLayout secure={true}>
      {tripQuery.success ? (
        <TripEditView trip={tripQuery.data} />
      ) : (
        <PageNotFoundFull />
      )}
    </MapLayout>
  );
}
