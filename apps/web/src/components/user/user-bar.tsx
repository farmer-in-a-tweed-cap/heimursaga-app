import { Skeleton } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';

import { UserAvatar } from './user-avatar';
import { VerificationBadge } from './verification-badge';

type Props = {
  name?: string;
  picture?: string;
  text?: string;
  creator?: boolean;
  loading?: boolean;
};

export const UserBar: React.FC<Props> = ({
  name = 'user',
  picture = '',
  text,
  creator = false,
  loading = false,
}) => {
  return (
    <div className="flex flex-row gap-4 justify-start items-center">
      {loading ? (
        <div className="w-[48px] h-[48px] flex flex-row items-center justify-start">
          <Skeleton className="w-[48px] h-[48px] rounded-full" />
        </div>
      ) : (
        <UserAvatar
          src={picture}
          fallback={name}
          className={cn(
            "w-[48px] h-[48px]",
            creator ? 'border-2 border-primary' : ''
          )}
        />
      )}
      <div className="flex flex-col justify-start items-start gap-0">
        {loading ? (
          <div className="h-[16px] flex flex-row items-center justify-start">
            <Skeleton className="w-[60px] h-[12px]" />
          </div>
        ) : (
          <div className="h-[16px] flex flex-row gap-1 justify-start items-center">
            <span className="text-lg font-medium text-black">{name}</span>
            {/* {creator && <VerificationBadge />} */}
          </div>
        )}
        {text ? (
          loading ? (
            <div className="h-[14px] flex flex-row items-center justify-start">
              <Skeleton className="w-[80px] h-[10px]" />
            </div>
          ) : (
            <span className="text-sm font-normal text-gray-600 capitalize">
              {text}
            </span>
          )
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};
