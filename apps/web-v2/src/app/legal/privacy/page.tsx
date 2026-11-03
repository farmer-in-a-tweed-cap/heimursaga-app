import type { Metadata } from 'next';
import { PrivacyPolicyPage } from '@/app/pages/PrivacyPolicyPage';
import { DEFAULT_OG_IMAGE } from '@/lib/static-map';

export const metadata: Metadata = {
  alternates: { canonical: '/legal/privacy' },
  title: 'Privacy Policy',
  description:
    'Read the Privacy Policy for Heimursaga. Learn how we collect, use, and protect your personal data.',
  openGraph: {
    images: [DEFAULT_OG_IMAGE],
    title: 'Privacy Policy | Heimursaga',
    description:
      'Read the Privacy Policy for Heimursaga. Learn how we collect, use, and protect your personal data.',
    url: 'https://heimursaga.com/legal/privacy',
  },
};

export default function Page() {
  return <PrivacyPolicyPage />;
}
