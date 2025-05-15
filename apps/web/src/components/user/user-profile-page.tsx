import { IUserProfileDetail } from '@repo/types';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
} from '@repo/ui/components';

import { UserMapBanner } from './user-map-banner';
import { UserPageSections } from './user-page-sections';
import { UserProfileButtons } from './user-profile-buttons';

type Props = {
  user: IUserProfileDetail;
  section?: string;
  me?: boolean;
};

export const UserProfilePage: React.FC<Props> = ({
  user,
  section,
  me = false,
}) => {
  const isCreator = user.creator ? user.creator : false;

  return (
    <div className="w-full flex flex-col justify-start items-center">
      {/* <div className="z-10 w-full h-auto">
        <UserMapBanner className="z-30" username={user?.username} />
      </div> */}
      <div className="z-20 w-auto flex flex-col items-center rounded-full">
        <Avatar className="z-50 w-[80px] h-[80px] overflow-hidden">
          <AvatarFallback>{user?.name?.slice(0, 1)}</AvatarFallback>
          <AvatarImage
            width={80}
            height={80}
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
      {/* <div className="mt-4">
        <Badge variant="outline">Sponsored</Badge>
      </div> */}

      <UserProfileButtons
        me={user?.you}
        creator={isCreator}
        followed={user?.followed}
        user={user}
      />
      <div className="mt-10 w-full flex flex-col">
        {user?.username && (
          <UserPageSections
            username={user?.username}
            section={section}
            me={me}
          />
        )}
      </div>
    </div>
  );
};
