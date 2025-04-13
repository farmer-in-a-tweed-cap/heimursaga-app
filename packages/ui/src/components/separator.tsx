import { cn } from './../lib/utils';

export const Separator = ({
  className,
}: React.ComponentPropsWithoutRef<'div'>) => {
  return <div className={cn(className, 'w-full h-[1px] bg-gray-200')}></div>;
};
