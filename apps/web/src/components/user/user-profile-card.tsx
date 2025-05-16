import { Card, CardContent } from '@repo/ui/components';
import Link from 'next/link';

import { BackButton, UserAvatar } from '@/components';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
  name?: string;
  picture?: string;
};

export const UserProfileCard: React.FC<Props> = ({
  username = '',
  name = '',
  picture = '',
}) => {
  return (
    <Card>
      <CardContent className="pt-2 pb-4">
        <div className="absolute left-2 top-2">
          <BackButton href={username ? ROUTER.MEMBERS.MEMBER(username) : '#'} />
        </div>
        <div className="flex flex-col items-center justify-center gap-0">
          <UserAvatar className="w-[50px] h-[50px]" src={picture} />
          <Link href={username ? ROUTER.MEMBERS.MEMBER(username) : '#'}>
            <div className="mt-1 flex flex-col items-center gap-0">
              <span className="font-medium text-lg">{name}</span>
              <span className="text-xs font-medium text-gray-600">
                @{username}
              </span>
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
