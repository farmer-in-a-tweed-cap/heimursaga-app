import { IUserProfileDetail } from '@repo/types';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/ui/components';

import { UserMapBanner } from './user-map-banner';
import { UserPageSections } from './user-page-sections';
import { UserProfileButtons } from './user-profile-buttons';

type Props = {
  user: IUserProfileDetail;
  section?: string;
};

export const UserProfilePage: React.FC<Props> = ({ user, section }) => {
  return (
    <div className="w-full flex flex-col justify-start items-center">
      {/* <div className="z-10 w-full h-auto">
        <UserMapBanner className="z-30" username={user?.username} />
      </div> */}
      <div className="z-20 w-auto flex flex-col items-center rounded-full">
        <Avatar className="z-50 w-[100px] h-[100px] overflow-hidden">
          <AvatarFallback>{user?.name?.slice(0, 1)}</AvatarFallback>
          <AvatarImage
            width={100}
            height={100}
            src={user?.picture}
            className="w-full h-auto"
            alt="avatar"
          />
        </Avatar>
      </div>
      <div className="mt-6 flex flex-col justify-center items-center gap-2">
        <span className="text-2xl font-semibold">{user?.name}</span>
        <span className="text-sm font-normal text-gray-600">{user?.bio}</span>
      </div>
      <UserProfileButtons
        me={user?.you}
        followed={user?.followed}
        user={user}
      />
      <div className="mt-10 w-full flex flex-col">
        {user?.username && (
          <UserPageSections username={user?.username} section={section} />
        )}
      </div>
    </div>
  );
};
