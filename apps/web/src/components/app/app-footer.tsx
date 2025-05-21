import { APP_CONFIG } from '@/config';

export const AppFooter = () => {
  return (
    <div className="w-full h-auto min-h-[320px] bg-secondary text-neutral-200 text-base flex flex-row justify-center py-8">
      <div className="app-container flex flex-row">
        <span>&copy; {APP_CONFIG.APP.NAME} - 2025</span>
      </div>
    </div>
  );
};
