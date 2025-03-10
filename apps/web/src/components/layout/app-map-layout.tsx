import { cn } from '@repo/ui/lib/utils';

import { AppFooter, AppHeader } from '@/components';

export const AppMapLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative w-full min-h-screen bg-[#EFEFEC] text-black flex flex-col justify-start">
      <div className={cn('z-20 absolute top-0 left-0 right-0 h-[64px]')}>
        <AppHeader />
      </div>
      <div
        className={cn(
          'z-10 relative w-full h-[100vh] box-border flex flex-row',
          `pt-[64px]`,
        )}
      >
        {children}
      </div>
      <AppFooter />
    </div>
  );
};
