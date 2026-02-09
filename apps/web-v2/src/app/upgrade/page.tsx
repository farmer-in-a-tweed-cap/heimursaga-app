import type { Metadata } from 'next';
import { UpgradePage } from '@/app/pages/UpgradePage';

export const metadata: Metadata = {
  title: 'Explorer Pro',
  description:
    'Upgrade to Explorer Pro for unlimited expeditions, advanced analytics, messaging, and more.',
};

export default function Page() {
  return <UpgradePage />;
}
