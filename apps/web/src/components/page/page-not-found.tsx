import { Button } from '@repo/ui/components';
import { Link2OffIcon } from 'lucide-react';
import Link from 'next/link';

import { ROUTER } from '@/router';

export const PageNotFound = () => <>page not found</>;

export const PageNotFoundFull = () => (
  <div className="w-full h-screen flex flex-row items-center justify-center">
    <div className="flex flex-col items-center justify-center">
      <Link2OffIcon size={60} />
      <div className="mt-4 flex flex-col items-center justify-center gap-4">
        <span className="text-xl font-medium">page not found</span>
        <Button variant="secondary" asChild>
          <Link href={ROUTER.HOME}>home page</Link>
        </Button>
      </div>
    </div>
  </div>
);
