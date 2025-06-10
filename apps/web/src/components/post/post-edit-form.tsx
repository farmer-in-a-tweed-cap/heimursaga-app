'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  DatePicker,
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
import { useToast } from '@repo/ui/hooks';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import {
  MODALS,
  MapLocationPickModalOnSubmitHandler,
  MapPreview,
} from '@/components';
import { MapLocationPickModalProps } from '@/components';
import { APP_CONFIG } from '@/config';
import { useModal, useSession } from '@/hooks';
import { dateformat, zodMessage } from '@/lib';
import { LOCALES } from '@/locales';

const schema = z.object({
  title: z
    .string()
    .nonempty(zodMessage.required('title'))
    .min(5, zodMessage.string.min('title', 5))
    .max(50, zodMessage.string.max('title', 50)),
  content: z
    .string()
    .nonempty(zodMessage.required('content'))
    .min(0, zodMessage.string.min('content', 0))
    .max(1000, zodMessage.string.max('content', 1000)),
  place: z
    .string()
    .nonempty(zodMessage.required('place'))
    .min(0, zodMessage.string.min('place', 0))
    .max(50, zodMessage.string.max('place', 50))
    .optional(),
  date: z.date().optional(),
});

type Props = {
  postId: string;
  defaultValues?: {
    title?: string;
    content?: string;
    lat?: number;
    lon?: number;
    public?: boolean;
    sponsored?: boolean;
    date?: Date;
    place?: string;
  };
};

export const PostEditForm: React.FC<Props> = ({ postId, defaultValues }) => {
  const modal = useModal();
  const toast = useToast();
  const session = useSession();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? {
          title: defaultValues?.title,
          content: defaultValues?.content,
          place: defaultValues?.place,
          date: defaultValues?.date ? new Date(defaultValues?.date) : undefined,
        }
      : {},
  });

  const [loading, setLoading] = useState<{ post: boolean; privacy: boolean }>({
    post: false,
    privacy: false,
  });

  const [privacy, setPrivacy] = useState<{
    public: boolean;
    sponsored: boolean;
  }>({
    public: defaultValues?.public || false,
    sponsored: defaultValues?.sponsored || false,
  });

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

  const handlePrivacyChange = async (payload: {
    sponsored?: boolean;
    public?: boolean;
  }) => {
    try {
      if (!postId) return;

      setLoading((loading) => ({ ...loading, privacy: true }));

      setPrivacy((privacy) => ({
        ...privacy,
        public:
          typeof payload?.public === 'undefined'
            ? privacy.public
            : payload.public,
        sponsored:
          typeof payload?.sponsored === 'undefined'
            ? privacy.sponsored
            : payload.sponsored,
      }));

      // update the post
      await apiClient.updatePost({
        query: { id: postId },
        payload: {
          public: payload.public,
          sponsored: payload.sponsored,
        },
      });

      setLoading((loading) => ({ ...loading, privacy: false }));
    } catch (e) {
      setLoading((loading) => ({ ...loading, privacy: false }));
    }
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        if (!postId) return;

        setLoading((loading) => ({ ...loading, post: true }));

        const { lat, lon } = location;

        // update the post
        const { success } = await apiClient.updatePost({
          query: { id: postId },
          payload: {
            ...values,
            lat,
            lon,
          },
        });

        if (success) {
          setLoading((loading) => ({ ...loading, post: false }));
        } else {
          toast({
            type: 'error',
            message: LOCALES.APP.POSTS.TOAST.NOT_UPDATED,
          });
          setLoading((loading) => ({ ...loading, post: false }));
        }
      } catch (e) {
        setLoading((loading) => ({ ...loading, post: false }));
      }
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
                          <Input disabled={loading.post} required {...field} />
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
                            disabled={loading.post}
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            format={(date) =>
                              dateformat(date).format('MMM DD, YYYY')
                            }
                            date={form.watch('date')}
                            onChange={(date) => form.setValue('date', date)}
                            disabled={loading.post}
                            inputProps={{
                              name: field.name,
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="place"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Place</FormLabel>
                        <FormControl>
                          <Input disabled={loading.post} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-row justify-start items-center gap-14">
                  <FormControl>
                    <FormItem>
                      <FormLabel>Public</FormLabel>
                      <Switch
                        checked={privacy.public}
                        aria-readonly
                        disabled={loading.privacy}
                        onCheckedChange={(checked) =>
                          handlePrivacyChange({ public: checked })
                        }
                      />
                    </FormItem>
                  </FormControl>
                  {session.creator && (
                    <FormControl>
                      <FormItem>
                        <FormLabel>Sponsored</FormLabel>
                        <Switch
                          checked={privacy.sponsored}
                          aria-readonly
                          disabled={loading.privacy}
                          onCheckedChange={(checked) =>
                            handlePrivacyChange({ sponsored: checked })
                          }
                        />
                      </FormItem>
                    </FormControl>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    type="submit"
                    className="min-w-[140px]"
                    loading={loading.post}
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
