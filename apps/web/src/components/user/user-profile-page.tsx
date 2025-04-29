import { SponsorButton } from '../sponsorship';
import { IUserProfileDetail } from '@repo/types';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
} from '@repo/ui/components';
import Link from 'next/link';

import { ROUTER } from '@/router';

import { UserFollowButton } from './user-follow-button';
import { UserMapBanner } from './user-map-banner';
import { UserPageSections } from './user-page-sections';

type Props = {
  user: IUserProfileDetail;
  section?: string;
};

export const UserProfilePage: React.FC<Props> = ({ user, section }) => {
  return (
    <div className="w-full flex flex-col justify-start items-center">
      <div className="z-10 w-full h-auto">
        <UserMapBanner className="z-30" username={user?.username} />
      </div>
      <div className="z-20 -mt-[60px] w-auto flex flex-col items-center rounded-full">
        <Avatar className="z-50 w-[120px] h-[120px] overflow-hidden">
          <AvatarFallback>{user?.name?.slice(0, 1)}</AvatarFallback>
          <AvatarImage
            width={120}
            height={120}
            src={user?.picture}
            className="w-full h-auto"
            alt="avatar"
          />
        </Avatar>
      </div>
      <div className="z-20 w-full max-w-2xl flex flex-col items-center">
        <div className="mt-6 flex flex-col justify-center items-center gap-2">
          <span className="text-3xl font-semibold">{user?.name}</span>
          <span className="text-sm">{user?.bio}</span>
        </div>
        {user?.you ? (
          <div className="mt-6 flex flex-row gap-2">
            <Button variant="outline" asChild>
              <Link href={ROUTER.USER.SETTINGS.HOME}>Edit profile</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex flex-row gap-2 items-center">
            <UserFollowButton
              username={user?.username}
              followed={user?.followed}
            />
            <SponsorButton username={user?.username} />
          </div>
        )}
      </div>
      <div className="mt-10 w-full flex flex-col">
        {user?.username && (
          <UserPageSections username={user?.username} section={section} />
        )}
      </div>
    </div>
  );
};
