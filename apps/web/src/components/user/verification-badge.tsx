import { cn } from '@repo/ui/lib/utils';
import { VerifiedIcon } from 'lucide-react';

type Props = {
  size?: 'lg' | 'base';
};

export const VerificationBadge: React.FC<Props> = ({ size = 'base' }) => {
  let className = '';

  switch (size) {
    case 'lg':
      className = cn(className, 'w-[20px] h-[20px]');
      break;
    case 'base':
      className = cn(className, 'w-[14px] h-[14px]');
      break;
  }

  return (
    <div
      className={cn(
        'rounded-full bg-primary text-white font-medium flex items-center justify-center',
        className,
      )}
    >
      <VerifiedIcon size={14} />
    </div>
  );
};
