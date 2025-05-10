'use client';

import { Button } from '@repo/ui/components';
import Link from 'next/link';

import { SponsorButton, UserFollowButton } from '@/components';
import { useSession } from '@/hooks';
import { ROUTER } from '@/router';

type Props = {
  me?: boolean;
  followed?: boolean;
  creator?: boolean;
  user?: {
    username: string;
    name: string;
    bio?: string;
  };
};

export const UserProfileButtons: React.FC<Props> = ({
  me = false,
  followed = false,
  creator = false,
  user,
}) => {
  const session = useSession();

  return session.logged ? (
    <div className="z-20 w-full max-w-2xl flex flex-col items-center">
      {me ? (
        <div className="mt-6 flex flex-row gap-2">
          <Button variant="secondary" asChild>
            <Link href={ROUTER.USER.SETTINGS.HOME}>Edit profile</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-row gap-2 items-center">
          <UserFollowButton username={user?.username} followed={followed} />
          {creator && <SponsorButton username={user?.username} />}
        </div>
      )}
    </div>
  ) : (
    <></>
  );
};
