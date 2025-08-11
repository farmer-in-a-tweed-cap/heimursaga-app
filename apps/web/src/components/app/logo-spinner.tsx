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
        return 'w-12 h-12 lg:w-16 lg:h-16'; // 48px mobile, 64px desktop
      case 'md':
        return 'w-16 h-16 lg:w-20 lg:h-20'; // 64px mobile, 80px desktop
      case 'lg':
        return 'w-20 h-20 lg:w-28 lg:h-28'; // 80px mobile, 112px desktop
      default:
        return 'w-12 h-12 lg:w-16 lg:h-16';
    }
  };

  const logoSrc = color === 'light' ? '/heimursaga_badge.svg' : '/heimursaga_badge.svg'; // Using same optimized SVG for both

  return (
    <div 
      className={cn(
        getSizeClasses(),
        'animate-spin',
        className
      )}
      style={{ 
        animationDuration: '2s',
      }}
    >
      <img
        src={logoSrc}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'crisp-edges',
          // Apply color filter for light variant if needed
          filter: color === 'light' ? 'brightness(0) saturate(100%) invert(100%)' : 'none',
        }}
      />
    </div>
  );
};