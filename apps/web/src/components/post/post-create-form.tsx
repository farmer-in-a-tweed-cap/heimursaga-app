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
import { MapPinIcon } from '@repo/ui/icons';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import {
  MODALS,
  MapLocationPickModalOnSubmitHandler,
  MapLocationPickModalProps,
  MapPreview,
} from '@/components';
import { APP_CONFIG } from '@/config';
import { MapCoordinatesValue, useMap, useModal, useSession } from '@/hooks';
import { dateformat, redirect, zodMessage } from '@/lib';
import { ROUTER } from '@/router';

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
    .max(3000, zodMessage.string.max('content', 3000)),
  place: z
    .string()
    .nonempty(zodMessage.required('place'))
    .min(0, zodMessage.string.min('place', 0))
    .max(50, zodMessage.string.max('place', 50))
    .optional(),
  date: z.date().optional(),
});

type Props = {
  waypoint?: {
    id: number;
    title?: string;
    lat: number;
    lon: number;
  };
};

export const PostCreateForm: React.FC<Props> = ({ waypoint }) => {
  const modal = useModal();
  const session = useSession();
  const toast = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      place: '',
      date: new Date(),
    },
  });

  const [loading, setLoading] = useState<boolean>(false);

  const map = useMap();

  const [privacy, setPrivacy] = useState<{
    public: boolean;
    sponsored: boolean;
  }>({
    public: true,
    sponsored: false,
  });

  const handleLocationPickModal = () => {
    modal.open<MapLocationPickModalProps>(MODALS.MAP_LOCATION_PICK, {
      full: true,
      props: {
        center: map.marker ? map.marker : map.center,
        zoom: map.marker ? APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM : 4,
        marker: map.marker,
      },
      onSubmit: ((data) => {
        const { center, marker, zoom } = data || {};

        map.setMarker(marker);
        map.setZoom(zoom);
        map.setCenter(center);
      }) as MapLocationPickModalOnSubmitHandler,
      onCancel: () => {},
    });
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { title, content, place, date } = values;
        const { marker } = map;

        setLoading(true);

        // create a post
        const { success, data } = await apiClient.createPost({
          title,
          content,
          place,
          date,
          lat: marker?.lat,
          lon: marker?.lon,
          public: privacy.public,
          sponsored: privacy.sponsored,
          waypointId: waypoint?.id,
        });

        if (success) {
          const postId = data?.id;

          // redirect to post detail page
          if (postId) {
            redirect(ROUTER.POSTS.DETAIL(postId));
          }
        } else {
          setLoading(false);
          toast({ type: 'error', message: 'post not created' });
        }
      } catch (e) {
        setLoading(false);
        toast({ type: 'error', message: 'post not created' });
      }
    },
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4">
        <MapPreview
          zoom={map.marker ? APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM : 4}
          center={map.marker}
          marker={map.marker}
          overlay={waypoint ? false : true}
          onClick={handleLocationPickModal}
        />
        {waypoint && (
          <div className="flex flex-row items-center justify-start gap-1">
            <MapPinIcon weight="bold" size={18} />
            <span className="text-base font-medium">
              {waypoint?.title ? `(${waypoint.title})` : ''}{' '}
              {`[${waypoint.lon.toFixed(4)}, ${waypoint.lat.toFixed(4)}]`}
            </span>
          </div>
        )}
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
                            disabled={loading}
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
                          <Input disabled={loading} {...field} />
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
                        disabled={loading}
                        onCheckedChange={(checked) =>
                          setPrivacy((prev) => ({ ...prev, public: checked }))
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
                          disabled={loading}
                          onCheckedChange={(checked) =>
                            setPrivacy((prev) => ({
                              ...prev,
                              sponsored: checked,
                            }))
                          }
                        />
                      </FormItem>
                    </FormControl>
                  )}
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
