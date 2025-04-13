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
import { cn } from '@repo/ui/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { resetPasswordMutation } from '@/lib/api';
import { fieldmsg } from '@/lib/utils';

import { ROUTER } from '@/router';

const schema = z.object({
  email: z
    .string()
    .email(fieldmsg.email())
    .nonempty(fieldmsg.required('email'))
    .min(2, fieldmsg.min('email', 2))
    .max(50, fieldmsg.max('email', 30)),
});

export const ResetPasswordForm = () => {
  const [loading, setLoading] = useState<boolean>(false);

  const toast = useToast();

  const mutation = useMutation({
    mutationFn: resetPasswordMutation.mutationFn,
    onSuccess: () => {
      toast({ type: 'success', message: 'we sent you a link' });
      setLoading(false);
    },
    onError: (e) => {
      console.log('error', e);
      const message = e?.message;

      if (message) {
        form.setError('email', { message });
      } else {
        form.setError('email', { message: `something went wrong` });
      }

      setLoading(false);
    },
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
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
