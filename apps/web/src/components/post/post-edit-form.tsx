'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { IPostDetail } from '@repo/types';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
    .min(1, zodMessage.required('content'))
    .refine((content) => {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      return wordCount >= 100;
    }, { message: 'Content must be at least 100 words' })
    .refine((content) => {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      return wordCount <= 1000;
    }, { message: 'Content must not exceed 1000 words' }),
  place: z
    .string()
    .nonempty(zodMessage.required('place'))
    .max(50, zodMessage.string.max('place', 50)),
  date: z.date().optional(),
  journeyId: z.string().nonempty(zodMessage.required('journey')).optional(),
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

        toast({ type: 'success', message: 'journey removed' });
      } else {
        toast({ type: 'error', message: 'journey not removed' });
      }

      setLoading((prev) => ({ ...prev, trip: false }));
    } catch (e) {
      toast({ type: 'error', message: 'journey not removed' });
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

      // Apply toggle interdependency logic
      let newPrivacy = { ...privacy };
      
      if (typeof payload?.public !== 'undefined') {
        newPrivacy.public = payload.public;
        // If making private, also disable sponsored
        if (!payload.public) {
          newPrivacy.sponsored = false;
        }
      }
      
      if (typeof payload?.sponsored !== 'undefined') {
        newPrivacy.sponsored = payload.sponsored;
      }

      setPrivacy(newPrivacy);

      // update the post
      await apiClient.updatePost({
        query: { id: postId },
        payload: {
          public: newPrivacy.public,
          sponsored: newPrivacy.sponsored,
        },
      });

      setLoading((loading) => ({ ...loading, privacy: false }));
    } catch (e) {
      setLoading((loading) => ({ ...loading, privacy: false }));
    }
  };

  const handleValidationError = () => {
    const errors = form.formState.errors;
    if (errors.title) {
      toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.TITLE_REQUIRED });
    } else if (errors.content) {
      toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.CONTENT_REQUIRED });
    } else if (errors.place) {
      toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.LOCATION_REQUIRED });
    } else {
      toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.FIELDS_REQUIRED });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postId) return;
    
    const formData = form.getValues();
    
    // For private entries (drafts), minimal validation
    if (!privacy.public) {
      const { title, content, place, date } = formData;
      const { marker } = map;
      
      // Check required fields for private entries
      if (!title?.trim()) {
        toast({ type: 'error', message: 'Title is required' });
        return;
      }
      
      if (!place?.trim()) {
        toast({ type: 'error', message: 'Place is required' });
        return;
      }
      
      if (!date) {
        toast({ type: 'error', message: 'Date is required' });
        return;
      }
      
      if (!marker) {
        toast({ type: 'error', message: 'Please select a location on the map' });
        return;
      }

      try {
        const tripId = trip?.id;

        const uploads: string[] = uploader.files
          .map(({ uploadId }) => uploadId)
          .filter((el) => typeof el === 'string');

        setLoading((loading) => ({ ...loading, post: true }));

        // update the post (draft)
        const { success } = await apiClient.updatePost({
          query: { id: postId },
          payload: {
            ...formData,
            content: content?.trim() || ' ', // Send a space if content is empty to satisfy API validation
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
            message: LOCALES.APP.POSTS.TOAST.NOT_SAVED,
          });
          setLoading((loading) => ({ ...loading, post: false }));
        }
      } catch (e) {
        toast({
          type: 'error',
          message: LOCALES.APP.POSTS.TOAST.NOT_SAVED,
        });
        setLoading((loading) => ({ ...loading, post: false }));
      }
      return;
    }

    // For public entries, use full validation
    form.handleSubmit(
      async (values: z.infer<typeof schema>) => {
        try {
          const tripId = trip?.id;
          const { marker } = map;

          // Check map marker for public entries too
          if (!marker) {
            toast({ type: 'error', message: 'Please select a location on the map' });
            return;
          }

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
              message: LOCALES.APP.POSTS.TOAST.NOT_SAVED,
            });
            setLoading((loading) => ({ ...loading, post: false }));
          }
        } catch (e) {
          toast({
            type: 'error',
            message: LOCALES.APP.POSTS.TOAST.NOT_SAVED,
          });
          setLoading((loading) => ({ ...loading, post: false }));
        }
      },
      handleValidationError,
    )(e);
  };

  // cache modals
  useEffect(() => {
    modal.preload([MODALS.TRIP_SELECT, MODALS.MAP_LOCATION_SELECT]);
  }, [modal.preload]);

  return (
    <div className="flex flex-col">
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            
            {/* Section 1: Place marker at location */}
            <Card>
              <CardHeader>
                <CardTitle>Place marker at location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-auto mb-4">
                  <MapPreview
                    zoom={map.marker ? APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM : 4}
                    center={map.marker}
                    marker={map.marker}
                    onClick={handleLocationPickModal}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Select Journey */}
            {session.creator && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Journey</CardTitle>
                </CardHeader>
                <CardContent>
                  <PostTripAddButton
                    trip={trip || undefined}
                    loading={loading.trip}
                    onAdd={handleTripSelectModal}
                    onRemove={handleTripRemove}
                  />
                </CardContent>
              </Card>
            )}

            {/* Section 3: Write Entry Content */}
            <Card>
              <CardHeader>
                <CardTitle>Write Entry Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <p className="text-xs text-gray-500 mb-2">a unique and descriptive title</p>
                          <FormControl>
                            <Input disabled={loading.post} {...field} />
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
                          <p className="text-xs text-gray-500 mb-2">date of occurrence - may be different from the date you log the entry</p>
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
                          <p className="text-xs text-gray-500 mb-2">the place where it happened - the official name or your own name</p>
                          <FormControl>
                            <Input disabled={loading.post} {...field} />
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
                      render={({ field }) => {
                        const content = field.value || '';
                        const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;

                        const getWordCountColor = () => {
                          if (wordCount < 100) return 'text-red-400';
                          if (wordCount > 1000) return 'text-red-400';
                          if (wordCount > 900) return 'text-orange-400';
                          return 'text-gray-400';
                        };

                        return (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Tell your story</FormLabel>
                              <span className={`text-xs ${getWordCountColor()}`}>
                                {wordCount} / 1000 words
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">in 100-1,000 words, if there's more write a series!</p>
                            <FormControl>
                              <Textarea
                                className="min-h-[180px]"
                                disabled={loading.post}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Upload Your Photo(s) */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Photo(s)</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Section 5: Confirm Privacy and Save Entry */}
            <Card>
              <CardHeader>
                <CardTitle>Confirm Privacy and Save Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-row justify-start items-center gap-14">
                  <FormControl>
                    <FormItem>
                      <FormLabel>Public</FormLabel>
                      <Switch
                        checked={privacy.public}
                        disabled={loading.privacy || privacy.sponsored}
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
                          disabled={loading.privacy || !privacy.public}
                          onCheckedChange={(checked) =>
                            handlePrivacyChange({ sponsored: checked })
                          }
                        />
                      </FormItem>
                    </FormControl>
                  )}
                </div>
                <div className="mt-6">
                  <Button
                    type="submit"
                    className="min-w-[140px]"
                    loading={loading.post}
                  >
                    {privacy.public ? 'Save Entry' : 'Save Private Entry'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
};
