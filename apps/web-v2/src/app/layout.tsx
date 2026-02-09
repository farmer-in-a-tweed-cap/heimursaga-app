import type { Metadata } from 'next';
import Script from 'next/script';
import { ClientProviders } from './client-providers';
import '@/styles/index.css';
import 'mapbox-gl/dist/mapbox-gl.css';

export const metadata: Metadata = {
  title: {
    default: 'Heimursaga — Journaling & Fundraising for Explorers',
    template: '%s | Heimursaga',
  },
  description:
    'Document your adventures with geo-tagged journal entries, connect with fellow explorers, and raise funds from sponsors who want to support your travels.',
  keywords: [
    'Heimursaga',
    'travel journal',
    'expedition journal',
    'explorer',
    'geo-tagged entries',
    'travel sponsorship',
    'adventure funding',
    'travel community',
    'travel planning',
    'fundraising',
  ],
  authors: [{ name: 'The Peripety Company' }],
  openGraph: {
    type: 'website',
    siteName: 'Heimursaga',
    locale: 'en_US',
    title: 'Heimursaga — Journaling & Fundraising for Explorers',
    description:
      'Document your adventures with geo-tagged journal entries, connect with fellow explorers, and raise funds from sponsors who want to support your travels.',
    images: [
      {
        url: 'https://heimursaga.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Heimursaga — Journaling & Fundraising for Explorers',
    description:
      'Document your adventures with geo-tagged journal entries, connect with fellow explorers, and raise funds from sponsors who want to support your travels.',
    images: ['https://heimursaga.com/og-image.jpg'],
    creator: '@heimursaga',
  },
  icons: { icon: '/favicon.ico' },
  metadataBase: new URL('https://heimursaga.com'),
  other: {
    'theme-color': '#ac6d46',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
      </head>
      <body>
        {/* Dark mode flash prevention */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('heimursaga-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <ClientProviders>{children}</ClientProviders>

        {/* reCAPTCHA v3 */}
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
            strategy="afterInteractive"
          />
        )}

        {/* Google Analytics */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
