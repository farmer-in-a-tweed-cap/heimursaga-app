import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import Link from 'next/link';

import { ROUTER } from '@/router';

export const SignupForm = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) => {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up.</CardTitle>
          <CardDescription>Create your free account today.</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">First name</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Last name</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email address"
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Sign up
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link
                href={ROUTER.LOGIN}
                className="underline underline-offset-4"
              >
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
