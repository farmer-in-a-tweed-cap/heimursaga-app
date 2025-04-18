'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
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
  name: z
    .string()
    .nonempty(fieldmsg.required('name'))
    .min(2, fieldmsg.min('name', 2))
    .max(50, fieldmsg.max('name', 20)),
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

export const SignupForm = () => {
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
      name: '',
      username: '',
      email: '',
      password: '',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      setLoading(true);

      mutation.mutate(values);
    },
  );

  return (
    <div className={cn('flex flex-col gap-6')}>
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Welcome back.</h2>
          <span className="text-sm">Create your free account today.</span>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input disabled={loading} required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
