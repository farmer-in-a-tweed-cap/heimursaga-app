import type { Metadata } from 'next';
import { TermsOfServicePage } from '@/app/pages/TermsOfServicePage';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

export default function Page() {
  return <TermsOfServicePage />;
}
