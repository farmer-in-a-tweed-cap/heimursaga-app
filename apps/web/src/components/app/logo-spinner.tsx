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
        return 'w-10 h-10'; // 40px - bigger than standard spinner (24px)
      case 'md':
        return 'w-14 h-14'; // 56px - bigger than standard spinner (32px)
      case 'lg':
        return 'w-20 h-20'; // 80px - bigger than standard spinner (48px)
      default:
        return 'w-10 h-10';
    }
  };

  const getImageDimensions = () => {
    switch (size) {
      case 'sm':
        return { width: 40, height: 40 };
      case 'md':
        return { width: 56, height: 56 };
      case 'lg':
        return { width: 80, height: 80 };
      default:
        return { width: 40, height: 40 };
    }
  };

  const logoSrc = color === 'light' ? '/logo-sm-light.svg' : '/logo-sm-dark.svg';
  const imageDimensions = getImageDimensions();

  return (
    <div 
      className={cn(
        getSizeClasses(),
        className
      )}
      style={{ 
        animation: 'spin 2s linear infinite' // Slower 2-second rotation instead of 1s
      }}
    >
      <Image
        src={logoSrc}
        width={imageDimensions.width}
        height={imageDimensions.height}
        alt=""
        className="w-full h-full object-contain"
        priority={false}
      />
    </div>
  );
};