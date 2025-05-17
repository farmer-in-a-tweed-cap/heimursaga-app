import { Skeleton } from '@repo/ui/components';

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
  text = '****',
  creator = false,
  loading = false,
}) => {
  return (
    <div className="flex flex-row gap-2 justify-start items-center">
      {loading ? (
        <div className="w-[36px] h-[36px] flex flex-row items-center justify-start">
          <Skeleton className="w-[34px] h-[34px] rounded-full" />
        </div>
      ) : (
        <UserAvatar src={picture} fallback={name} />
      )}
      <div className="flex flex-col justify-start items-start gap-0">
        {loading ? (
          <div className="h-[12px] flex flex-row items-center justify-start">
            <Skeleton className="w-[40px] h-[8px]" />
          </div>
        ) : (
          <div className="h-[12px] flex flex-row gap-1 justify-start items-center">
            <span className="text-sm font-medium text-black">{name}</span>
            {creator && <VerificationBadge />}
          </div>
        )}
        {loading ? (
          <div className="h-[12px] flex flex-row items-center justify-start">
            <Skeleton className="w-[100px] h-[8px]" />
          </div>
        ) : (
          <span className="text-[0.75rem] font-normal text-gray-600">
            {text}
          </span>
        )}
      </div>
    </div>
  );
};
