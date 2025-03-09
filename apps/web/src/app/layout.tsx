import '@repo/ui/globals.css';
import { Metadata } from 'next';

import { AppFooter, AppHeader } from '@/components';

export const metadata: Metadata = {
  title: 'saga',
  description: 'a journaling platform for travelers',
  openGraph: {
    title: 'saga',
    description: 'a journaling platform for travelers',
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" sizes="any" />
      </head>
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
