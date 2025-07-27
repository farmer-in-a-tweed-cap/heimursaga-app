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
  Label,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import { redirect, zodMessage } from '@/lib';
import { ROUTER } from '@/router';

const schema = z.object({
  login: z
    .string()
    .nonempty(zodMessage.required('login'))
    .max(50, zodMessage.string.max('login', 30)),
  password: z
    .string()
    .nonempty(zodMessage.required('password'))
    .min(2, zodMessage.string.min('password', 8))
    .max(50, zodMessage.string.max('password', 20)),
});

export const LoginForm = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { login, password } = values;

        setLoading(true);

        // login
        const { success } = await apiClient.login({
          query: {},
          payload: { login, password },
        });

        if (success) {
          // redirect to the home page
          redirect(ROUTER.HOME);
        } else {
          form.setError('password', { message: `Login or password invalid` });
          setLoading(false);
        }
      } catch (e) {
        form.setError('password', { message: `Login or password invalid` });
        setLoading(false);
      }
    },
  );

  return (
    <div className="w-full flex flex-col gap-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold">Welcome back!</h2>
          <span className="text-sm">Log in and start exploring.</span>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="login"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or username</FormLabel>
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
