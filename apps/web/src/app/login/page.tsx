import { Metadata } from 'next';

import { LoginForm } from '@/components';
import { LoginLayout } from '@/layouts';

export const metadata: Metadata = {
  title: 'Log in',
};

export default async function Page() {
  return (
    <LoginLayout>
      <LoginForm />
    </LoginLayout>
  );
}
