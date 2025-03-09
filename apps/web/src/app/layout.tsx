import "@repo/ui/globals.css";

import { AppHeader } from "@/components";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="w-full min-h-screen bg-neutral-100 text-black flex flex-col justify-start">
          <AppHeader />
          <div className="w-full flex flex-col lg:p-6">{children}</div>
        </div>
      </body>
    </html>
  );
}
