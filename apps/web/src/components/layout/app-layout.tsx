import { AppFooter, AppHeader } from '@/components';

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full min-h-screen bg-[#EFEFEC] text-black flex flex-col justify-start">
      <AppHeader />
      <div className="w-full h-auto min-h-screen flex flex-col py-6">
        {children}
      </div>
      <AppFooter />
    </div>
  );
};
