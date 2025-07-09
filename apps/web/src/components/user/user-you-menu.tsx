'use client';

import { useSession } from '@/hooks';

import { UserBar } from './user-bar';

type Props = {};

export const UserYouMenu = () => {
  const session = useSession();

  const { username = '', email = '', picture = '' } = session || {};

  return (
    <div className="flex flex-col">
      <UserBar name={username} picture={picture} />
    </div>
  );
};
