'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogTrigger,
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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { postUpdateMutation } from '@/lib/api';
import { fieldmsg } from '@/lib/utils';

import { MapDialog } from '@/components/dialog';

import { Map, MapPreviewOverlay } from '@/components';
import { MAP_DEFAULT_COORDINATES } from '@/constants';
import { useMapbox } from '@/hooks/use-mapbox';

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
  const mapbox = useMapbox();

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
    lat: defaultValues?.lat || MAP_DEFAULT_COORDINATES.LAT,
    lon: defaultValues?.lon || MAP_DEFAULT_COORDINATES.LON,
    alt: MAP_DEFAULT_COORDINATES.ALT,
    marker: {
      lat: defaultValues?.lat || MAP_DEFAULT_COORDINATES.LAT,
      lon: defaultValues?.lon || MAP_DEFAULT_COORDINATES.LON,
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

  const handleLocationChange = (location: {
    lat: number;
    lon: number;
    alt: number;
    marker?: {
      lat: number;
      lon: number;
    };
  }) => {
    const { lat, lon, alt, marker } = location;

    setLocation((location) => ({
      ...location,
      lat,
      lon,
      alt,
      marker,
    }));
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

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4">
        <div>
          <Dialog>
            <DialogTrigger asChild>
              {mapbox.token && (
                <div className="relative w-full aspect-5/2 rounded-xl overflow-hidden">
                  <MapPreviewOverlay />
                  <Map
                    token={mapbox.token}
                    marker={location.marker}
                    coordinates={{
                      lat: location.lat,
                      lon: location.lon,
                      alt: location.alt,
                    }}
                    cursor="pointer"
                    controls={false}
                    disabled={true}
                    markerEnabled={true}
                    className="z-10"
                  />
                </div>
              )}
            </DialogTrigger>
            <MapDialog
              marker={location.marker}
              coordinates={{
                lat: location.lat,
                lon: location.lon,
                alt: location.alt,
              }}
              onSubmit={handleLocationChange}
            />
          </Dialog>
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
