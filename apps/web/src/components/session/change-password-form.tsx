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
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import { redirect, zodMessage } from '@/lib';
import { ROUTER } from '@/router';

const schema = z
  .object({
    password: z
      .string()
      .nonempty(zodMessage.required('password'))
      .min(2, zodMessage.string.min('password', 2))
      .max(20, zodMessage.string.max('password', 20)),
    passwordConfirmation: z
      .string()
      .nonempty(zodMessage.required('password'))
      .min(2, zodMessage.string.min('password', 2))
      .max(20, zodMessage.string.max('password', 20)),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords must match',
    path: ['passwordConfirmation'],
  });

type Props = {
  token?: string;
};

export const ChangePasswordForm: React.FC<Props> = ({ token }) => {
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        if (!token) return;

        const { password } = values;

        setLoading(true);

        const { success } = await apiClient.updatePassword({
          query: {},
          payload: { token, password },
        });

        if (success) {
          redirect(ROUTER.LOGIN);
        } else {
          toast({ type: 'error', message: 'Token is invalid' });
        }

        setLoading(false);
      } catch (e) {
        setLoading(false);
        toast({ type: 'error', message: 'Token is invalid' });
      }
    },
  );

  return (
    <div className="w-full flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
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
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="passwordConfirmation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
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
                <div className="flex flex-col gap-2 items-center">
                  <Button type="submit" className="w-full" loading={loading}>
                    Submit
                  </Button>
                  <Link
                    href={ROUTER.LOGIN}
                    className="mt-4 text-sm hover:underline"
                  >
                    Back to log in
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
