import { LoginForm } from '@/components';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full justify-center p-6 md:p-8">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
