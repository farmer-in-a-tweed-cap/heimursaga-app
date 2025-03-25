'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
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
import { useToast } from '@repo/ui/hooks';
import { cn } from '@repo/ui/lib/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  getUserProfileSettingsQuery,
  updateUserPictureMutation,
  updateUserProfileSettingsMutation,
} from '@/lib/api';
import { fieldmsg, redirect } from '@/lib/utils';

import { useSession } from '@/hooks';
import { IUserProfileSettings } from '@/types';

import { UserAvatarUploadPicker } from './user-avatar-upload-picker';

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

  bio: z
    .string()
    .nonempty(fieldmsg.required('bio'))
    .min(0, fieldmsg.min('bio', 0))
    .max(140, fieldmsg.max('bio', 140)),
});

type Props = {
  data?: IUserProfileSettings;
};

export const UserSettingsProfileView: React.FC<Props> = ({ data }) => {
  const router = useRouter();
  const toast = useToast();

  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [pictureLoading, setPictureLoading] = useState<boolean>(false);

  const onError = (e: Error) => {
    setSettingsLoading(false);
    setPictureLoading(false);
    console.log('settings not update', e);
    // toast({ message: 'settings updated' });
  };

  const settingsUpdateMutation = useMutation({
    mutationFn: updateUserProfileSettingsMutation.mutationFn,
    onSuccess: () => {
      setSettingsLoading(false);
      toast({ message: 'settings updated' });
      router.refresh();
    },
    onError,
  });

  const pictureUpdateMutation = useMutation({
    mutationFn: updateUserPictureMutation.mutationFn,
    onSuccess: () => {
      setPictureLoading(false);
      router.refresh();
    },
    onError,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: data
      ? { ...data }
      : {
          firstName: '',
          lastName: '',
          bio: '',
        },
  });

  const handleAvatarChange = (file: File) => {
    setPictureLoading(true);

    pictureUpdateMutation.mutate({ file });
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      setSettingsLoading(true);
      settingsUpdateMutation.mutate(values);
    },
  );

  return (
    <div className={cn('flex flex-col gap-6')}>
      <UserAvatarUploadPicker
        src={data?.picture}
        loading={pictureLoading}
        fallback={data?.firstName}
        onChange={handleAvatarChange}
      />
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input disabled={settingsLoading} required {...field} />
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
                      <Input disabled={settingsLoading} required {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* <div className="grid gap-2">
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
            </div> */}
            {/* <div className="grid gap-2">
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
            </div> */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="livesIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lives in</FormLabel>
                    <FormControl>
                      <Input disabled={loading} required {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="travelsIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Travels in</FormLabel>
                    <FormControl>
                      <Input disabled={loading} required {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div> */}
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[120px]"
                        disabled={settingsLoading}
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
              <Button type="submit" loading={settingsLoading}>
                Save
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};
