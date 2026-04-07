import type { Metadata } from 'next';
import { GuideProgramPage } from '@/app/pages/GuideProgramPage';

export const metadata: Metadata = {
  title: 'Expedition Guide Program',
  description:
    'Learn about the Expedition Guide Program on Heimursaga. Professional guides create curated expedition blueprints that explorers can launch and experience.',
};

export default function Page() {
  return <GuideProgramPage />;
}
