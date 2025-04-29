import { UserAvatar } from './user-avatar';

type Props = {
  name?: string;
  picture?: string;
  text?: string;
};

export const UserBar: React.FC<Props> = ({
  name = 'user',
  picture = '',
  text = '****',
}) => (
  <div className="flex flex-row gap-2 justify-start items-center">
    <UserAvatar src={picture} fallback={name} />
    <div className="flex flex-col justify-start items-start gap-0">
      <span className="text-base font-medium text-black">{name}</span>
      <span className="text-xs font-normal text-gray-600">{text}</span>
    </div>
  </div>
);
