import { LogoBrandDark } from '@repo/ui/components';

import { SignupForm } from '@/components';
import { AppLayout } from '@/layouts';

export default function Page() {
  return (
    <AppLayout>
      <div className="flex w-full justify-center p-6 md:p-8">
        <div className="w-full max-w-md flex flex-col justify-start items-center gap-6">
          <div className="w-full max-w-[140px]">
            <LogoBrandDark />
          </div>
          <div className="w-full">
            <SignupForm />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
