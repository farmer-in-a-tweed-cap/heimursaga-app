'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { IUserSettingsProfileResponse } from '@repo/types';
import {
  Button,
  Card,
  CardContent,
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
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import {
  updateUserPictureMutation,
  updateUserProfileSettingsMutation,
} from '@/lib/api';
import { fieldmsg } from '@/lib/utils';

import { UserAvatarUploadPicker } from './user-avatar-upload-picker';

const schema = z.object({
  name: z
    .string()
    .nonempty(fieldmsg.required('name'))
    .min(2, fieldmsg.min('name', 2))
    .max(50, fieldmsg.max('name', 20)),
  bio: z
    .string()
    .nonempty(fieldmsg.required('bio'))
    .min(0, fieldmsg.min('bio', 0))
    .max(140, fieldmsg.max('bio', 140)),
});

type Props = {
  data?: IUserSettingsProfileResponse;
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
    toast({ type: 'error', message: 'settings not updated' });
  };

  const settingsUpdateMutation = useMutation({
    mutationFn: updateUserProfileSettingsMutation.mutationFn,
    onSuccess: () => {
      setSettingsLoading(false);
      toast({ type: 'success', message: 'settings updated' });
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
          name: '',
          bio: '',
        },
  });

  const handleAvatarChange = (file: File) => {
    setPictureLoading(true);

    pictureUpdateMutation.mutate({ query: {}, payload: { file } });
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      setSettingsLoading(true);
      settingsUpdateMutation.mutate(values);
    },
  );

  return (
    <Card className={cn('flex flex-col gap-6')}>
      <CardContent>
        <UserAvatarUploadPicker
          src={data?.picture}
          loading={pictureLoading}
          fallback={data?.name}
          onChange={handleAvatarChange}
        />
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
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
      </CardContent>
    </Card>
  );
};
