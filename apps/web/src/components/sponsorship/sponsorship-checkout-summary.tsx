import Link from 'next/link';

import { UserAvatar } from '@/components';
import { ROUTER } from '@/router';

type Props = {
  user?: {
    username?: string;
    // name: string;
    picture: string;
    bio?: string;
  };
};

export const SponsorCheckoutSummary: React.FC<Props> = ({ user }) => {
  return (
    <div className="flex flex-col items-center text-center">
      <UserAvatar
        className="w-[80px] h-[80px]"
        src={user?.picture}
        fallback={user?.username}
      />
      <Link
        href={user?.username ? ROUTER.USERS.DETAIL(user.username) : '#'}
        className="mt-2 flex flex-col gap-0 justify-center items-center"
      >
        <span className="text-lg font-medium">{user?.username}</span>
      </Link>
      {user?.bio && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-3">{user.bio}</p>
      )}
    </div>
  );
};
