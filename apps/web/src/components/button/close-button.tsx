'use client';

import { XIcon } from '@repo/ui/icons';
import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';

type Props = {
  redirect?: string;
  className?: string;
  onClick?: () => void;
};

export const CloseButton: React.FC<Props> = ({
  redirect,
  className,
  onClick,
}) => {
  const router = useRouter();

  const handleClick = () => {
    if (redirect) {
      router.push(redirect);
      return;
    } else {
      if (onClick) {
        onClick();
      }
    }
  };

  return (
    <button
      className={cn(
        'flex items-center justify-center w-10 h-10 bg-transparent rounded-full hover:bg-accent transition-all',
        className,
      )}
      aria-label="Close"
      onClick={handleClick}
    >
      <XIcon size={20} />
    </button>
  );
};
