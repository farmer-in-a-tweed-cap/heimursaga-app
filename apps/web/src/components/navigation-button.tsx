'use client';

import { Button, ButtonProps } from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';

import { useNavigation } from '@/hooks';

type NavigationButtonProps = ButtonProps & {
  href: string;
  replace?: boolean;
};

export const NavigationButton: React.FC<NavigationButtonProps> = ({
  href,
  replace = false,
  onClick,
  disabled,
  className,
  children,
  ...buttonProps
}) => {
  const { navigateTo, isNavigating } = useNavigation();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }

    if (disabled || isNavigating) {
      return;
    }

    navigateTo(href, replace);
  };

  return (
    <Button
      {...buttonProps}
      onClick={handleClick}
      disabled={disabled || isNavigating}
      className={cn(
        className,
        isNavigating && 'opacity-60 transition-opacity'
      )}
    >
      {children}
    </Button>
  );
};