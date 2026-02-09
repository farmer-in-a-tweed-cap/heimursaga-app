import type { Metadata } from 'next';
import { PrivacyPolicyPage } from '@/app/pages/PrivacyPolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default function Page() {
  return <PrivacyPolicyPage />;
}
