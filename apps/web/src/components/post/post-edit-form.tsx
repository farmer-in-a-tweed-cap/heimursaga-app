'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { IPostDetail } from '@repo/types';
import {
  Button,
  DatePicker,
  FilePicker,
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
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import {
  MODALS,
  MapLocationPickModalOnSubmitHandler,
  MapPreview,
  PostTripAddButton,
  TripSelectModalProps,
  TripSelectModalSubmitHandler,
} from '@/components';
import { MapLocationPickModalProps } from '@/components';
import { APP_CONFIG } from '@/config';
import { FILE_ACCEPT } from '@/constants';
import { useMap, useModal, useSession, useUploads } from '@/hooks';
import { dateformat, normalizeText, zodMessage } from '@/lib';
import { LOCALES } from '@/locales';

const schema = z.object({
  title: z
    .string()
    .nonempty(zodMessage.required('title'))
    .max(50, zodMessage.string.max('title', 50)),
  content: z
    .string()
    .nonempty(zodMessage.required('content'))
    .max(3000, zodMessage.string.max('content', 3000)),
  place: z
    .string()
    .nonempty(zodMessage.required('place'))
    .max(50, zodMessage.string.max('place', 50))
    .optional(),
  date: z.date().optional(),
});

type Props = {
  postId: string;
  values?: Partial<IPostDetail>;
};

export const PostEditForm: React.FC<Props> = ({ postId, values }) => {
  const modal = useModal();
  const toast = useToast();
  const session = useSession();
  const queryClient = useQueryClient();

  const { waypoint } = values || {};

  const map = useMap({
    marker: waypoint
      ? {
          lat: waypoint.lat,
          lon: waypoint.lon,
        }
      : undefined,
  });

  const uploader = useUploads({
    files: values?.media
      ? values?.media?.map(({ id, thumbnail }, key) => ({
          id: key,
          uploadId: id,
          src: thumbnail,
        }))
      : [],
    maxFiles: session.creator ? 3 : 1,
    maxSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
  });

  const [loading, setLoading] = useState<{
    post: boolean;
    privacy: boolean;
    trip: boolean;
  }>({
    post: false,
    privacy: false,
    trip: false,
  });
  const [trip, setTrip] = useState<{ id: string; title: string } | null>(
    values?.trip || null,
  );

  const [privacy, setPrivacy] = useState<{
    public: boolean;
    sponsored: boolean;
  }>({
    public: values?.public || false,
    sponsored: values?.sponsored || false,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: {
      title: values?.title || '',
      content: normalizeText(values?.content || ''),
      place: values?.place || '',
      date: values?.date ? new Date(values?.date) : new Date(),
    },
  });

  const handleTripSelectModal = () => {
    modal.open<TripSelectModalProps>(MODALS.TRIP_SELECT, {
      full: false,
      props: { creator: session.creator },
      onSubmit: ((data) => {
        const { id, title } = data;
        setTrip({ id, title });
      }) as TripSelectModalSubmitHandler,
      onCancel: () => {},
    });
  };

  const handleTripRemove = async () => {
    try {
      const waypointId = values?.waypoint?.id;
      const tripId = values?.trip?.id;
      const enabled = waypointId && tripId;

      if (!enabled) return;

      setLoading((prev) => ({ ...prev, trip: true }));

      // delete the trip waypoint
      const { success } = await apiClient.deleteTripWaypoint({
        query: {
          tripId,
          waypointId,
        },
      });

      if (success) {
        setTrip(null);

        toast({ type: 'success', message: 'trip has been removed' });
      } else {
        toast({ type: 'error', message: 'trip is not removed' });
      }

      setLoading((prev) => ({ ...prev, trip: false }));
    } catch (e) {
      toast({ type: 'error', message: 'trip is not removed' });
      setLoading((prev) => ({ ...prev, trip: false }));
    }
  };

  const handleLocationPickModal = () => {
    modal.open<MapLocationPickModalProps>(MODALS.MAP_LOCATION_SELECT, {
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

        const tripId = trip?.id;
        const { marker } = map;

        const uploads: string[] = uploader.files
          .map(({ uploadId }) => uploadId)
          .filter((el) => typeof el === 'string');

        setLoading((loading) => ({ ...loading, post: true }));

        // update the post
        const { success } = await apiClient.updatePost({
          query: { id: postId },
          payload: {
            ...values,
            public: privacy.public,
            sponsored: privacy.sponsored,
            waypoint: {
              lat: marker?.lat,
              lon: marker?.lon,
            },
            tripId,
            uploads,
          },
        });

        if (success) {
          // Invalidate relevant queries to update the UI
          queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.POSTS] });
          queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.MAP.QUERY] });
          queryClient.invalidateQueries({ queryKey: [API_QUERY_KEYS.USER.POSTS] });
          
          // Show success toast
          toast({
            type: 'success',
            message: 'entry saved',
          });
          
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
    modal.preload([MODALS.TRIP_SELECT, MODALS.MAP_LOCATION_SELECT]);
  }, [modal.preload]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4">
        <MapPreview
          zoom={map.marker ? APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM : 4}
          center={map.marker}
          marker={map.marker}
          onClick={handleLocationPickModal}
        />
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
                {session.creator && (
                  <div className="flex flex-row">
                    <FormItem>
                      <FormLabel>Journey</FormLabel>
                      <div className="mt-1">
                        <PostTripAddButton
                          trip={trip || undefined}
                          loading={loading.trip}
                          onAdd={handleTripSelectModal}
                          onRemove={handleTripRemove}
                        />
                      </div>
                    </FormItem>
                  </div>
                )}
                <div>
                  <FormItem>
                    <FormLabel>
                      Photos ({uploader.files.length}/{uploader.maxFiles})
                    </FormLabel>
                    <FilePicker
                      accept={FILE_ACCEPT.IMAGE}
                      files={uploader.files}
                      maxFiles={uploader.maxFiles}
                      maxSize={uploader.maxSize}
                      loader={uploader.loader}
                      onChange={uploader.handleFileChange}
                      onLoad={uploader.handleFileLoad}
                      onRemove={uploader.handleFileRemove}
                    />
                  </FormItem>
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
                            date={field.value}
                            onChange={field.onChange}
                            disabled={loading.post}
                            disabledDates={{ after: new Date() }}
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
                    Save Entry
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
