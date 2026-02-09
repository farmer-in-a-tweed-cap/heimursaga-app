import type { Metadata } from 'next';
import { ContactPage } from '@/app/pages/ContactPage';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the Heimursaga team for support, feedback, or partnerships.',
};

export default function Page() {
  return <ContactPage />;
}
