import Image from 'next/image';
import { cn } from '@repo/ui/lib/utils';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  color?: 'dark' | 'light';
  className?: string;
};

export const LogoSpinner: React.FC<Props> = ({ 
  color = 'dark', 
  size = 'sm',
  className 
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8'; // 32px
      case 'md':
        return 'w-12 h-12'; // 48px
      case 'lg':
        return 'w-16 h-16'; // 64px
      default:
        return 'w-8 h-8';
    }
  };

  const logoSrc = color === 'light' ? '/logo-sm-light.svg' : '/logo-sm-dark.svg';

  return (
    <div className={cn(
      'animate-spin',
      getSizeClasses(),
      className
    )}>
      <Image
        src={logoSrc}
        width={48}
        height={48}
        alt=""
        className="w-full h-full object-contain"
        priority={false}
      />
    </div>
  );
};