'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useMutation } from '@tanstack/react-query';
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
  bio: z
    .string()
    .nonempty(fieldmsg.required('bio'))
    .min(0, fieldmsg.min('bio', 0))
    .max(140, fieldmsg.max('bio', 140)),
  email: z
    .string()
    .email(fieldmsg.email())
    .nonempty(fieldmsg.required('email'))
    .min(2, fieldmsg.min('email', 2))
    .max(50, fieldmsg.max('email', 30)),
});

export const UserSettingsProfileView = () => {
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
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      bio: '',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      setLoading(true);

      //   mutation.mutate(values);
    },
  );

  return (
    <div className={cn('flex flex-col gap-6')}>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div>
              <Avatar className="w-[120px] h-[120px]">
                <AvatarFallback>H</AvatarFallback>
                <AvatarImage />
              </Avatar>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
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
              />{' '}
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
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[180px]"
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

            <div>
              <Button type="submit" loading={loading}>
                Save
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};
