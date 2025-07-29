'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AppErrorCode } from '@repo/types';
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
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import { redirect, zodMessage } from '@/lib';
import { useRecaptcha } from '@/hooks/use-recaptcha';
import { ROUTER } from '@/router';

const schema = z.object({
  // name: z
  //   .string()
  //   .nonempty(zodMessage.required('name'))
  //   .min(2, zodMessage.string.min('name', 2))
  //   .max(50, zodMessage.string.max('name', 20)),
  username: z
    .string()
    .nonempty(zodMessage.required('username'))
    .min(2, zodMessage.string.min('username', 2))
    .max(50, zodMessage.string.max('username', 20)),
  email: z
    .string()
    .email(zodMessage.email())
    .nonempty(zodMessage.required('email'))
    .min(2, zodMessage.string.min('email', 2))
    .max(50, zodMessage.string.max('email', 30)),
  password: z
    .string()
    .nonempty(zodMessage.required('password'))
    .min(8, zodMessage.string.min('password', 8))
    .max(50, zodMessage.string.max('password', 50)),
});

export const SignupForm = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);
  const { executeRecaptcha, isConfigured } = useRecaptcha();

  // Fix hydration issue
  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      // name: '',
      username: '',
      email: '',
      password: '',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { email, password, username } = values;

        setLoading(true);

        // Get reCAPTCHA token if configured
        let recaptchaToken: string | undefined;
        if (isConfigured) {
          recaptchaToken = (await executeRecaptcha('signup')) || undefined;
          if (!recaptchaToken) {
            form.setError('password', { message: 'Please complete the verification' });
            setLoading(false);
            return;
          }
        }

        // sign up
        const { success, message } = await apiClient.signup({
          query: {},
          payload: { email, password, username, recaptchaToken },
        });

        if (success) {
          // redirect to the user guide for new users
          redirect(ROUTER.USER_GUIDE);
        } else {
          switch (message) {
            case AppErrorCode.EMAIL_ALREADY_IN_USE:
              form.setError('email', { message: 'Email already in use' });
              break;
            case AppErrorCode.USERNAME_ALREADY_IN_USE:
              form.setError('username', { message: 'Username already in use' });
              break;
          }

          setLoading(false);
        }
      } catch (e) {
        form.setError('password', { message: 'Sign up failed' });
        setLoading(false);
      }
    },
  );

  return (
    <div className="w-full flex flex-col gap-6">
      <Card>
        <CardHeader>
          <h2 className="text-2xl font-bold text-center">Sign up</h2>
          <span className="text-sm text-center">Inspire the world. Create your free Explorer account today.</span>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                {/* <FormField
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
                /> */}

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
                <div className="flex flex-col gap-2">
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
                {mounted && isConfigured && (
                  <div className="text-xs text-gray-500 text-center">
                    This site is protected by reCAPTCHA and the Google{' '}
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Privacy Policy
                    </a>{' '}
                    and{' '}
                    <a
                      href="https://policies.google.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Terms of Service
                    </a>{' '}
                    apply.
                  </div>
                )}
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
              <div className="mt-3 text-center text-sm">
                <Link
                  href={ROUTER.HOME}
                  className="text-gray-500 hover:text-gray-700 transition-colors no-underline"
                >
                  Explore without signing up
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
