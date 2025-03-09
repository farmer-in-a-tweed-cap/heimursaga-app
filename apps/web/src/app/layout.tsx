import '@repo/ui/globals.css';

import { AppFooter, AppHeader } from '@/components';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="w-full min-h-screen bg-neutral-100 text-black flex flex-col justify-start">
          <AppHeader />
          <div className="w-full h-auto min-h-screen flex flex-col lg:p-6">
            {children}
          </div>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
