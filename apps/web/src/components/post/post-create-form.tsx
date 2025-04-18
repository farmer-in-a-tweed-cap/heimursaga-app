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
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { postCreateMutation } from '@/lib/api';
import { fieldmsg, redirect } from '@/lib/utils';

import {
  MODALS,
  MapLocationPickModalOnSubmitHandler,
  MapLocationPickModalProps,
  MapPreview,
} from '@/components';
import { APP_CONFIG } from '@/config';
import { useModal } from '@/hooks';
import { ROUTER } from '@/router';

const schema = z.object({
  title: z
    .string()
    .nonempty(fieldmsg.required('title'))
    .min(5, fieldmsg.min('title', 5))
    .max(50, fieldmsg.max('title', 50)),
  content: z
    .string()
    .nonempty(fieldmsg.required('content'))
    .min(2, fieldmsg.min('content', 25))
    .max(3000, fieldmsg.max('content', 3000)),
});

export const PostCreateForm = () => {
  const modal = useModal();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  const [loading, setLoading] = useState<boolean>(false);

  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
    alt: number;
    selected: boolean;
    marker?: {
      lat: number;
      lon: number;
    };
  }>({
    lat: APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT,
    lon: APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON,
    alt: APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
    selected: false,
  });

  const mutation = useMutation({
    mutationFn: postCreateMutation.mutationFn,
    onSuccess: (response) => {
      const { id } = response;

      // redirect to post detail page
      redirect(ROUTER.POSTS.DETAIL(id));
    },
    onError: (e) => {
      setLoading(false);
    },
  });

  const handleLocationPickModal = () => {
    modal.open<MapLocationPickModalProps>(MODALS.MAP_LOCATION_PICK, {
      full: true,
      props: {
        lat: location.marker ? location.marker?.lat : location.lat,
        lon: location.marker ? location.marker?.lon : location.lon,
        alt: location.selected ? APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM : 6,
        marker: location?.marker
          ? {
              lat: location?.marker?.lat,
              lon: location?.marker?.lon,
            }
          : undefined,
      },
      onSubmit: ((data) => {
        const { lat, lon, alt, marker } = data || {};

        setLocation((location) => ({
          ...location,
          selected: true,
          lat,
          lon,
          alt,
          marker,
        }));
      }) as MapLocationPickModalOnSubmitHandler,
      onCancel: () => {},
    });
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      setLoading(true);

      const { lat, lon } = location;

      await mutation.mutate({
        ...values,
        lat,
        lon,
      });
    },
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4">
        <div>
          <MapPreview
            lat={location.marker ? location.marker?.lat : location.lat}
            lon={location.marker ? location.marker?.lon : location.lon}
            alt={location.selected ? APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM : 6}
            markers={
              location.marker
                ? [
                    {
                      lat: location.marker?.lat,
                      lon: location.marker?.lon,
                    },
                  ]
                : undefined
            }
            onClick={handleLocationPickModal}
          />
        </div>
        <div className="mt-4">
          <Form {...form}>
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
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
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content</FormLabel>
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
                  <Button
                    type="submit"
                    className="min-w-[140px]"
                    loading={loading}
                  >
                    Post
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};
