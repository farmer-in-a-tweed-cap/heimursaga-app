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
import { useToast } from '@repo/ui/hooks';
import { cn } from '@repo/ui/lib/utils';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient, loginMutation } from '@/lib/api';
import { fieldmsg, redirect } from '@/lib/utils';

import { ROUTER } from '@/router';

const schema = z.object({
  email: z
    .string()
    .email(fieldmsg.email())
    .nonempty(fieldmsg.required('email'))
    .min(2, fieldmsg.min('email', 8))
    .max(50, fieldmsg.max('email', 30)),
  password: z
    .string()
    .nonempty(fieldmsg.required('password'))
    .min(2, fieldmsg.min('password', 8))
    .max(50, fieldmsg.max('password', 20)),
});

export const LoginForm = () => {
  const toast = useToast();
  const [loading, setLoading] = useState<boolean>(false);

  const mutation = useMutation({
    mutationFn: loginMutation.mutationFn,
    onSuccess: () => {
      // redirect to home page
      redirect(ROUTER.HOME);
    },
    onError: (e) => {
      console.log(e);
      setLoading(false);
    },
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { email, password } = values;

        setLoading(true);

        // login
        const { success } = await apiClient.login({
          query: {},
          payload: { email, password },
        });

        if (success) {
          // redirect to home page
          redirect(ROUTER.HOME);
        } else {
          form.setError('password', {
            message: `Email or password not correct`,
          });
          setLoading(false);
        }
      } catch (e) {
        form.setError('password', { message: `Email or password not correct` });
        setLoading(false);
      }
    },
  );

  return (
    <div className={cn('flex flex-col gap-6')}>
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Welcome back.</h2>
          <span className="text-sm">Log in and start exploring.</span>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
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
                        <div className="flex items-center">
                          <Label htmlFor="password">Password</Label>
                          <Link
                            href={ROUTER.RESET_PASSWORD}
                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                          >
                            Forgot your password?
                          </Link>
                        </div>
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
                  Login
                </Button>
                {/* <Button variant="outline" className="w-full" disabled>
                Login with Google
              </Button> */}
              </div>
              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{' '}
                <Link
                  href={ROUTER.SIGNUP}
                  className="underline underline-offset-4"
                >
                  Sign up
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
