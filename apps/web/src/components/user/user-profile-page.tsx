import { IUserDetail } from '@repo/types';
import { FlagIcon, MapPinIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';

import { UserAvatar } from './user-avatar';
import { UserMapBanner } from './user-map-banner';
import { UserPageSections } from './user-page-sections';
import { UserProfileButtons } from './user-profile-buttons';

type Props = {
  user: IUserDetail;
  section?: string;
  me?: boolean;
};

export const UserProfilePage: React.FC<Props> = ({
  user,
  section,
  me = false,
}) => {
  const isCreator = user.creator ? user.creator : false;

  const location = {
    visible: user.locationFrom || user.locationLives,
    from: user.locationFrom,
    lives: user.locationLives,
  };

  return (
    <div className="w-full max-w-4xl flex flex-col justify-start items-center">
      <div className="z-10 w-full h-auto">
        <UserMapBanner className="z-30" username={user?.username} />
      </div>
      <div className="-mt-[40px] z-20 w-auto flex flex-col items-center rounded-full">
        <UserAvatar
          src={user?.picture}
          className={cn(
            'z-50 w-[80px] h-[80px] overflow-hidden',
            isCreator ? 'border-4 border-primary' : '',
          )}
        />
      </div>
      <div className="mt-6 flex flex-col justify-center items-center gap-2">
        <div className="flex justify-center items-center gap-1">
          <span className="text-2xl font-semibold">{user?.name}</span>
        </div>
        <span className="text-sm font-normal text-gray-700">{user?.bio}</span>
        {location.visible && (
          <div className="flex flex-row items-center justify-center gap-3">
            {location.from && (
              <div className="mt-2 flex flex-row gap-1 items-center justify-start text-sm font-normal text-gray-700">
                <FlagIcon size={16} weight="bold" />
                <span>{location.from}</span>
              </div>
            )}
            {location.lives && (
              <div className="mt-2 flex flex-row gap-1 items-center justify-start text-sm font-normal text-gray-700">
                <MapPinIcon size={16} weight="bold" />
                <span>{location.lives}</span>
              </div>
            )}
          </div>
        )}
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
