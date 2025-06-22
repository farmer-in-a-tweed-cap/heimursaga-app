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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import { zodMessage } from '@/lib';
import { ROUTER } from '@/router';

const schema = z.object({
  email: z
    .string()
    .email(zodMessage.email())
    .nonempty(zodMessage.required('email'))
    .min(2, zodMessage.string.min('email', 2))
    .max(50, zodMessage.string.max('email', 30)),
});

export const ResetPasswordForm = () => {
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { email } = values;

        setLoading(true);

        // reset password
        const { success } = await apiClient.resetPassword({ email });

        if (success) {
          toast({ type: 'success', message: 'we sent you a reset link.' });
        } else {
          toast({ type: 'success', message: 'something went wrong.' });
        }

        setLoading(false);
      } catch (e) {
        toast({ type: 'success', message: 'something went wrong.' });
        setLoading(false);
      }
    },
  );

  return (
    <div className="w-full flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a magic link.
          </CardDescription>
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
                <div className="flex flex-col gap-2 items-center">
                  <Button type="submit" className="w-full" loading={loading}>
                    Send email
                  </Button>
                  <a
                    href={ROUTER.LOGIN}
                    className="mt-4 text-sm hover:underline"
                  >
                    Back to log in
                  </a>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
