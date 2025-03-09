import "@repo/ui/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="w-full min-h-screen bg-brand-primary text-white flex flex-col justify-center items-center">
          {children}
        </div>
      </body>
    </html>
  );
}
