import { Metadata } from 'next';

import { SignupForm } from '@/components';
import { LoginLayout } from '@/layouts';

export const metadata: Metadata = {
  title: 'Sign up',
};

export default function Page() {
  return (
    <LoginLayout>
      <SignupForm />
    </LoginLayout>
  );
}
