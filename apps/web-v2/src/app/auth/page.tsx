import type { Metadata } from 'next';
import { AuthPage } from '@/app/pages/AuthPage';

export const metadata: Metadata = {
  title: 'Log In or Register',
  description:
    'Log in or create a Heimursaga account to start documenting your expeditions.',
};

export default function Page() {
  return <AuthPage />;
}
