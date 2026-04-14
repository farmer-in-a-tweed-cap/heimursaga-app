import type { Metadata } from 'next';
import Script from 'next/script';
import { Lora, Jost } from 'next/font/google';
import { ClientProviders } from './client-providers';
import '@/styles/index.css';

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-jost',
  display: 'swap',
});

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
  alternates: { canonical: '/' },
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
    <html lang="en" suppressHydrationWarning className={`${lora.variable} ${jost.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preload" href="/logo-sm-light.svg" as="image" type="image/svg+xml" />
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        {/* Meta Pixel */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '3968616446768370');
              fbq('track', 'PageView');
            `,
          }}
        />
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=3968616446768370&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Heimursaga',
            url: 'https://heimursaga.com',
            description: 'Global expedition documentation and sponsorship platform',
          }) }}
        />
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
        <ClientProviders><main>{children}</main></ClientProviders>

        {/* reCAPTCHA v3 */}
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <Script
            src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
            strategy="afterInteractive"
          />
        )}

        {/* Google Analytics — GDPR: only load when consent cookie is present */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <Script id="ga4-consent" strategy="afterInteractive">
            {`
              (function() {
                if (document.cookie.indexOf('heimursaga-analytics-consent=granted') === -1) return;
                var s = document.createElement('script');
                s.src = 'https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}';
                s.async = true;
                document.head.appendChild(s);
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              })();
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
