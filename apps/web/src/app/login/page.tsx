import { AppLayout, LoginForm } from '@/components';

export default function Page() {
  return (
    <AppLayout>
      <div className="flex min-h-screen w-full justify-center p-6 md:p-8">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </AppLayout>
  );
}
