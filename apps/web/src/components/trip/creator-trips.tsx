'use client';

import { array } from '@/lib';
import { ROUTER } from '@/router';

import { TripCard } from './trip-card';

const data = array(10).map((_, key) => ({
  id: `${key}`,
  title: `trip ${key}`,
}));

export const CreatorTrips = () => {
  return (
    <div className="flex flex-col gap-2">
      {data.map(({ id, title }, key) => (
        <TripCard
          key={key}
          href={id ? ROUTER.TRIPS.EDIT(id) : '#'}
          id={id}
          title={title}
          postsCount={0}
        />
      ))}
    </div>
  );
};
