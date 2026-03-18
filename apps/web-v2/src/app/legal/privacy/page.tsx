import type { Metadata } from 'next';
import { PrivacyPolicyPage } from '@/app/pages/PrivacyPolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read the Privacy Policy for Heimursaga. Learn how we collect, use, and protect your personal data.',
  openGraph: {
    title: 'Privacy Policy | Heimursaga',
    description:
      'Read the Privacy Policy for Heimursaga. Learn how we collect, use, and protect your personal data.',
    url: 'https://heimursaga.com/legal/privacy',
  },
};

export default function Page() {
  return <PrivacyPolicyPage />;
}
