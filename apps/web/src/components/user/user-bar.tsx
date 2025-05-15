import { VerifiedIcon } from 'lucide-react';

import { UserAvatar } from './user-avatar';
import { VerificationBadge } from './verification-badge';

type Props = {
  name?: string;
  picture?: string;
  text?: string;
  creator?: boolean;
};

export const UserBar: React.FC<Props> = ({
  name = 'user',
  picture = '',
  text = '****',
  creator = false,
}) => (
  <div className="flex flex-row gap-2 justify-start items-center">
    <UserAvatar src={picture} fallback={name} />
    <div className="flex flex-col justify-start items-start gap-0">
      <div className="flex flex-row gap-1 justify-start items-center">
        <span className="text-sm font-medium text-black">{name}</span>
        {creator && <VerificationBadge />}
      </div>

      <span className="text-[0.75rem] font-normal text-gray-600">{text}</span>
    </div>
  </div>
);
