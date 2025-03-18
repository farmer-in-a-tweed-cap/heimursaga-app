import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
} from '@repo/ui/components';
import Link from 'next/link';

import { UserFollowButton } from '@/components';
import { ROUTER } from '@/router';

type Props = {
  username?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  memberDate?: Date;
  me?: boolean;
  followed?: boolean;
};

export const UserProfileCard: React.FC<Props> = ({
  username = '',
  firstName = '',
  lastName = '',
  picture = '',
  me = false,
  followed = false,
}) => (
  <Card className="w-full min-h-[140px] flex flex-col box-border p-6">
    <div className="flex flex-col">
      <Avatar className="w-[80px] h-[80px]">
        <AvatarImage src={picture} />
        <AvatarFallback className="text-base">
          {firstName.slice(0, 1)}
        </AvatarFallback>
      </Avatar>
      <div className="mt-4 flex flex-col gap-1">
        <span className="font-medium text-2xl">
          {firstName} {lastName}
        </span>
        <span className="text-sm font-medium text-gray-500">@{username}</span>
      </div>
      {/* <div className="mt-4 flex flex-col gap-1">
        <span className="text-sm font-medium">US, New York</span>
        <span className="text-gray-500 text-sm font-medium">
          Member since April 2023
        </span>
      </div> */}
      <div className="mt-6">
        {me ? (
          <Button variant="outline" asChild>
            <Link href={ROUTER.USER.SETTINGS.HOME}>Edit profile</Link>
          </Button>
        ) : (
          <UserFollowButton username={username} followed={followed} />
        )}
      </div>
    </div>
  </Card>
);
