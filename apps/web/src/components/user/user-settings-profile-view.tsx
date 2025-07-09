'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { IUserSettingsProfileGetResponse } from '@repo/types';
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

import { zodMessage } from '@/lib';

import { UserAvatarUploadPicker } from './user-avatar-upload-picker';

const schema = z.object({
  // name: z
  //   .string()
  //   .nonempty(zodMessage.required('name'))
  //   .min(2, zodMessage.string.min('name', 2))
  //   .max(50, zodMessage.string.max('name', 20)),
  username: z
    .string()
    .nonempty(zodMessage.required('username'))
    .min(4, zodMessage.string.min('username', 4))
    .max(20, zodMessage.string.max('username', 20)),
  email: z
    .string()
    .email(zodMessage.email())
    .nonempty(zodMessage.required('email'))
    .max(50, zodMessage.string.max('email', 50)),
  bio: z
    .string()
    .nonempty(zodMessage.required('bio'))
    .min(0, zodMessage.string.min('bio', 0))
    .max(140, zodMessage.string.max('bio', 140)),
  location_lives: z
    .string()
    .min(0, zodMessage.string.min('lives in', 0))
    .max(50, zodMessage.string.max('lives in', 50))
    .optional(),
  location_from: z
    .string()
    .min(0, zodMessage.string.min('from', 0))
    .max(50, zodMessage.string.max('from', 50))
    .optional(),
});

type Props = {
  data?: IUserSettingsProfileGetResponse;
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
      ? {
          email: data.email,
          username: data.username,
          // name: data.name,
          bio: data.bio,
          location_from: data.locationFrom,
          location_lives: data.locationLives,
        }
      : {
          // name: '',
          bio: '',
          location_from: '',
          location_lives: '',
        },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { bio, location_from, location_lives } = values;

        setLoading((loading) => ({ ...loading, settings: true }));

        // save the changes
        const { success } = await apiClient.updateUserProfileSettings({
          query: {},
          payload: {
            bio,
            from: location_from,
            livesIn: location_lives,
          },
        });

        if (success) {
          toast({ type: 'success', message: 'settings updated' });
          router.refresh();
        } else {
          toast({ type: 'error', message: 'settings not updated' });
        }

        setLoading((loading) => ({ ...loading, settings: false }));
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
          fallback={data?.username}
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
                {/* <FormField
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
                /> */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="location_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <FormControl>
                          <Input disabled={loading.settings} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location_lives"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lives in</FormLabel>
                        <FormControl>
                          <Input disabled={loading.settings} {...field} />
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
