import '@repo/ui/globals.css';
import Head from 'next/head';

export const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" href="/favicon.png" sizes="any" />
      </Head>
      <body>{children}</body>
    </html>
  );
};
