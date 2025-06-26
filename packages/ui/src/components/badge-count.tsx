import { cn } from './../lib/utils';

type Props = { count?: number; className?: string };

export const BadgeCount: React.FC<Props> = ({ count = 0, className }) => (
  <div
    className={cn(
      'flex items-center justify-center w-[24px] h-[24px] bg-primary text-white rounded-full text-xs font-medium',
      className,
    )}
  >
    {count >= 1 ? count : ''}
  </div>
);

export const BadgeDot: React.FC<Props> = ({ className }) => (
  <div
    className={cn(
      'flex items-center justify-center w-[0.6rem] h-[0.6rem] text-[0.55rem] bg-primary rounded-full font-medium',
      className,
    )}
  ></div>
);
