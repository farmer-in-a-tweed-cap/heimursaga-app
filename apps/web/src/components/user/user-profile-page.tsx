import { IUserProfileDetail } from '@repo/types';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components';

import { UserFollowButton } from './user-follow-button';
import { UserPageSections } from './user-page-sections';

type Props = {
  user: IUserProfileDetail;
  section?: string;
};

export const UserProfilePage: React.FC<Props> = ({ user, section }) => {
  return (
    <div className="w-full flex flex-col justify-start items-center">
      <div className="z-10 w-full h-[220px] lg:h-[280px] bg-gray-300 rounded-lg"></div>
      <div className="z-20 -mt-[60px] w-full max-w-2xl flex flex-col items-center">
        <Avatar className="w-[120px] h-[120px]">
          <AvatarFallback>{user?.firstName?.slice(0, 1)}</AvatarFallback>
          <AvatarImage
            width={120}
            height={120}
            src={user?.picture}
            alt="avatar"
          />
        </Avatar>
        <div className="mt-6 flex flex-col justify-center items-center gap-2">
          <span className="text-3xl font-semibold">{user?.firstName}</span>
          <span className="text-sm">digital nomad</span>
        </div>
        {user?.you ? (
          <></>
        ) : (
          <div className="mt-6 flex flex-row gap-2">
            <UserFollowButton
              username={user?.username}
              followed={user?.followed}
            />
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
