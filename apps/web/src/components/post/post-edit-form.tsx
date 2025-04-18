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
  Switch,
  Textarea,
} from '@repo/ui/components';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { postUpdateMutation } from '@/lib/api';
import { fieldmsg } from '@/lib/utils';

import {
  MODALS,
  MapLocationPickModalOnSubmitHandler,
  MapPreview,
} from '@/components';
import { MapLocationPickModalProps } from '@/components';
import { APP_CONFIG } from '@/config';
import { useModal } from '@/hooks';

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

type Props = {
  postId: string;
  defaultValues?: {
    title?: string;
    content?: string;
    lat?: number;
    lon?: number;
    public?: boolean;
  };
};

export const PostEditForm: React.FC<Props> = ({ postId, defaultValues }) => {
  const modal = useModal();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title,
      content: defaultValues?.content,
    },
  });

  const [visibility, setVisibility] = useState<{
    loading: boolean;
    public: boolean;
  }>({ public: defaultValues?.public || false, loading: false });

  const [loading, setLoading] = useState<boolean>(false);

  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
    alt: number;
    marker?: {
      lat: number;
      lon: number;
    };
  }>({
    lat: defaultValues?.lat || APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT,
    lon: defaultValues?.lon || APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON,
    alt: APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.ALT,
    marker: {
      lat: defaultValues?.lat || APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LAT,
      lon: defaultValues?.lon || APP_CONFIG.MAPBOX.DEFAULT.COORDINATES.LON,
    },
  });

  const mutation = useMutation({
    mutationFn: postUpdateMutation.mutationFn,
    onSuccess: (response) => {
      setLoading(false);
      setVisibility((state) => ({ ...state, loading: false }));
    },
    onError: (e) => {
      setLoading(false);
      setVisibility((state) => ({
        ...state,
        loading: false,
        public: !state.public,
      }));
    },
  });

  const handleLocationPickModal = () => {
    modal.open<MapLocationPickModalProps>(MODALS.MAP_LOCATION_PICK, {
      full: true,
      props: {
        lat: location.marker ? location.marker?.lat : location.lat,
        lon: location.marker ? location.marker?.lon : location.lon,
        alt: APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM,
        marker: location?.marker
          ? {
              lat: location?.marker?.lat,
              lon: location?.marker?.lon,
            }
          : undefined,
      },
      onSubmit: ((data) => {
        const { lat, lon, alt, marker } = data || {};
        setLocation((location) => ({ ...location, lat, lon, alt, marker }));
      }) as MapLocationPickModalOnSubmitHandler,
      onCancel: () => {},
    });
  };

  const handleVisibilityUpdate = (checked: boolean) => {
    setVisibility((state) => ({ ...state, loading: true, public: checked }));

    mutation.mutate({
      query: { id: postId },
      payload: { public: checked },
    });
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      if (!postId) return;

      setLoading(true);

      const { lat, lon } = location;

      mutation.mutate({
        query: { id: postId },
        payload: {
          ...values,
          lat,
          lon,
        },
      });
    },
  );

  // cache modals
  useEffect(() => {
    modal.preload([MODALS.MAP_LOCATION_PICK]);
  }, [modal.preload]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4">
        <div>
          <MapPreview
            lat={location.marker ? location.marker?.lat : location.lat}
            lon={location.marker ? location.marker?.lon : location.lon}
            alt={APP_CONFIG.MAPBOX.MAP_PREVIEW.ZOOM}
            marker={
              location.marker
                ? {
                    lat: location.marker?.lat,
                    lon: location.marker?.lon,
                  }
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
                <FormControl>
                  <FormItem>
                    <FormLabel>Public</FormLabel>
                    <Switch
                      checked={visibility.public}
                      aria-readonly
                      disabled={visibility.loading}
                      onCheckedChange={handleVisibilityUpdate}
                    />
                  </FormItem>
                </FormControl>
                <div className="mt-4">
                  <Button
                    type="submit"
                    className="min-w-[140px]"
                    loading={loading}
                  >
                    Save
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
