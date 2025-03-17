'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
} from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { signupMutation } from '@/lib/api';
import { fieldmsg, redirect } from '@/lib/utils';

import { ROUTER } from '@/router';

const schema = z.object({
  firstName: z
    .string()
    .nonempty(fieldmsg.required('first name'))
    .min(2, fieldmsg.min('first name', 2))
    .max(50, fieldmsg.max('first name', 20)),
  lastName: z
    .string()
    .nonempty(fieldmsg.required('last name'))
    .min(2, fieldmsg.min('last name', 2))
    .max(50, fieldmsg.max('last name', 20)),
  username: z
    .string()
    .nonempty(fieldmsg.required('username'))
    .min(2, fieldmsg.min('username', 2))
    .max(50, fieldmsg.max('username', 20)),
  email: z
    .string()
    .email(fieldmsg.email())
    .nonempty(fieldmsg.required('email'))
    .min(2, fieldmsg.min('email', 2))
    .max(50, fieldmsg.max('email', 30)),
  password: z
    .string()
    .nonempty(fieldmsg.required('password'))
    .min(2, fieldmsg.min('password', 2))
    .max(50, fieldmsg.max('password', 20)),
});

export const SignupForm = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) => {
  const [loading, setLoading] = useState<boolean>(false);

  const mutation = useMutation({
    mutationFn: signupMutation.mutationFn,
    onSuccess: () => {
      // redirect to login page
      redirect(ROUTER.LOGIN);
    },
    onError: (e) => {
      console.log('error', e);
      setLoading(false);
    },
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: 'jack',
      lastName: 'nicholson',
      username: 'jackyboy',
      email: 'me@example.com',
      password: '12345678',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      setLoading(true);

      mutation.mutate(values);
    },
  );

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up.</CardTitle>
          <CardDescription>Create your free account today.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input disabled={loading} required {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input disabled={loading} required {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input disabled={loading} required {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            disabled={loading}
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            disabled={loading}
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" loading={loading}>
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
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
