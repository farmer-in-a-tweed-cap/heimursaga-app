import Image from 'next/image';
import Link from 'next/link';

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
    <div className="flex flex-col">
      <div>
        <h2 className="font-medium text-lg">Creator</h2>
      </div>
      <div className="mt-6 flex flex-col">
        <div className="w-[120px] h-[120px] lg:w-[240px] lg:h-[240px] rounded-xl overflow-hidden flex justify-center items-center">
          <Image
            src={user?.picture || ''}
            alt={user?.username || ''}
            width={240}
            height={240}
            className="w-full h-auto"
          />
        </div>
        <Link
          href={user?.username ? ROUTER.USERS.DETAIL(user.username) : '#'}
          className="mt-3 flex flex-col gap-0 justify-start items-start"
        >
          <span className="text-2xl font-medium">{user?.username}</span>
          {/* <span className="text-sm font-medium text-gray-600">
            @{user?.username}
          </span> */}
        </Link>
      </div>
    </div>
  );
};
