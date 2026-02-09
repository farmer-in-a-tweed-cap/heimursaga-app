import type { Metadata } from 'next';
import { PasswordResetRequestPage } from '@/app/pages/PasswordResetRequestPage';

export const metadata: Metadata = {
  title: 'Reset Password',
  robots: 'noindex',
};

export default function Page() {
  return <PasswordResetRequestPage />;
}
