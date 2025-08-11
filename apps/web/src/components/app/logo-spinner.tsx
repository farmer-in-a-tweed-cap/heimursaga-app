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
        return 'w-10 h-10 lg:w-12 lg:h-12'; // 40px mobile, 48px desktop
      case 'md':
        return 'w-12 h-12 lg:w-16 lg:h-16'; // 48px mobile, 64px desktop
      case 'lg':
        return 'w-16 h-16 lg:w-24 lg:h-24'; // 64px mobile, 96px desktop
      default:
        return 'w-10 h-10 lg:w-12 lg:h-12';
    }
  };

  const logoSrc = color === 'light' ? '/logo-sm-light.svg' : '/logo-sm-dark.svg';

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
      <img
        src={logoSrc}
        alt=""
        style={{
          width: '100%',
          height: '100%',
          imageRendering: 'crisp-edges',
        }}
      />
    </div>
  );
};