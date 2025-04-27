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
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';
import { fieldmsg } from '@/lib/utils';

import { UserAvatarUploadPicker } from './user-avatar-upload-picker';

const schema = z.object({
  name: z
    .string()
    .nonempty(fieldmsg.required('name'))
    .min(2, fieldmsg.min('name', 2))
    .max(50, fieldmsg.max('name', 20)),
  username: z
    .string()
    .nonempty(fieldmsg.required('username'))
    .min(4, fieldmsg.min('username', 4))
    .max(20, fieldmsg.max('username', 20)),
  email: z
    .string()
    .email(fieldmsg.email())
    .nonempty(fieldmsg.required('email'))
    .max(50, fieldmsg.max('email', 50)),
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

  const [loading, setLoading] = useState<{
    picture: boolean;
    settings: boolean;
  }>({ picture: false, settings: false });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: data
      ? { ...data }
      : {
          name: '',
          bio: '',
        },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { name, bio } = values;

        setLoading((loading) => ({ ...loading, settings: true }));

        // save the changes
        await apiClient.updateUserProfileSettings({ name, bio });

        toast({ type: 'success', message: 'settings updated' });
        setLoading((loading) => ({ ...loading, settings: false }));
        router.refresh();
      } catch (e) {
        setLoading((loading) => ({ ...loading, settings: false }));
        toast({ type: 'error', message: 'settings not updated' });
      }
    },
  );

  const handlePictureUpdate = async (file: File) => {
    try {
      setLoading((loading) => ({ ...loading, picture: true }));

      // save the changes
      await apiClient.updateUserPicture({ file });

      setLoading((loading) => ({ ...loading, picture: false }));
    } catch (e) {
      setLoading((loading) => ({ ...loading, picture: false }));
    }
  };

  return (
    <Card className={cn('flex flex-col gap-6')}>
      <CardContent>
        <UserAvatarUploadPicker
          src={data?.picture}
          loading={loading.picture}
          fallback={data?.name}
          onChange={handlePictureUpdate}
        />
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="mt-8 gap-6 flex flex-col">
                <div className="w-full flex lg:flex-row flex-col gap-6">
                  <div className="basis-6/12 lg:basis-full">
                    <FormField
                      control={form.control}
                      name="email"
                      disabled
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="basis-6/12 lg:basis-full">
                    <FormField
                      control={form.control}
                      name="username"
                      disabled
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading.settings}
                          required
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                            disabled={loading.settings}
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div>
                <Button type="submit" loading={loading.settings}>
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
