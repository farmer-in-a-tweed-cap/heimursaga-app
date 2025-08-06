'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
  FormErrorMessage,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectInput,
  Switch,
  Textarea,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { MapPinIcon, PathIcon, XIcon } from '@repo/ui/icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import {
  CloseButton,
  MODALS,
  MapLocationPickModalOnSubmitHandler,
  MapLocationPickModalProps,
  MapPreview,
  PostTripAddButton,
  TripSelectModalProps,
  TripSelectModalSubmitHandler,
  AIDetectionWarning,
} from '@/components';
import { APP_CONFIG } from '@/config';
import { FILE_ACCEPT } from '@/constants';
import { useAIDetection, useImageAIDetection, useMap, useModal, useScroll, useSession, useUploads } from '@/hooks';
import { dateformat, redirect, zodMessage } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

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
  const [trip, setTrip] = useState<{ id: string; title: string } | null>(null);
  
  const [privacy, setPrivacy] = useState<{
    public: boolean;
    sponsored: boolean;
  }>({
    public: true,
    sponsored: false,
  });

  const map = useMap({
    marker: waypoint ? waypoint : undefined,
    zoom: waypoint ? APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM : 0,
  });

  const uploader = useUploads({
    maxFiles: session.creator ? 3 : 1,
    maxSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
  });

  // AI Content Detection
  const aiDetection = useAIDetection('post-content-textarea', {
    enabled: true,
    checkPaste: true,
    checkAIphrases: true,
    debounceMs: 2000, // Longer debounce for less interruption
  });

  // Image AI Detection
  const imageAIDetection = useImageAIDetection();

  const handleLocationPickModal = () => {
    modal.open<MapLocationPickModalProps>(MODALS.MAP_LOCATION_SELECT, {
      full: true,
      props: {
        center: map.marker ? map.marker : map.center,
        zoom: map.marker ? APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM : 0,
        marker: map.marker,
      },
      onSubmit: ((data) => {
        const { center, marker, zoom } = data || {};

        map.setMarker(marker);
        map.setCenter(center);

        if (marker) {
          map.setZoom(APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM);
        }
      }) as MapLocationPickModalOnSubmitHandler,
      onCancel: () => {},
    });
  };

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

  const handleTripRemove = () => {
    setTrip(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if uploads are still in progress
    const pendingUploads = uploader.files.filter(file => file.file && !file.uploadId && file.loading !== false);
    if (pendingUploads.length > 0) {
      toast({ type: 'error', message: 'Please wait for photo uploads to complete' });
      return;
    }
    
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
          .filter((el): el is string => typeof el === 'string' && el.length > 0);

        setLoading(true);

        // create a post (draft)
        const { success, data } = await apiClient.createPost({
          title,
          content: content?.trim() || ' ', // Send a space if content is empty to satisfy API validation
          place,
          date,
          lat: marker?.lat,
          lon: marker?.lon,
          public: privacy.public,
          sponsored: privacy.sponsored,
          waypointId: waypoint?.id,
          uploads,
          tripId,
        });

        if (success) {
          const postId = data?.id;

          // redirect to post detail page
          if (postId) {
            redirect(ROUTER.ENTRIES.DETAIL(postId));
          }
        } else {
          setLoading(false);
          toast({ type: 'error', message: LOCALES.APP.POSTS.TOAST.NOT_LOGGED });
        }
      } catch (e) {
        setLoading(false);
        toast({ type: 'error', message: LOCALES.APP.POSTS.TOAST.NOT_LOGGED });
      }
      return;
    }

    // For public entries, use full validation
    form.handleSubmit(
      async (values: z.infer<typeof schema>) => {
        try {
          const { title, content, place, date } = values;
          const tripId = trip?.id;
          const { marker } = map;

          // Check map marker for public entries too
          if (!marker) {
            toast({ type: 'error', message: 'Please select a location on the map' });
            return;
          }

          const uploads: string[] = uploader.files
            .map(({ uploadId }) => uploadId)
            .filter((el): el is string => typeof el === 'string' && el.length > 0);

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
            uploads,
            tripId,
          });

          if (success) {
            const postId = data?.id;

            // redirect to post detail page
            if (postId) {
              redirect(ROUTER.ENTRIES.DETAIL(postId));
            }
          } else {
            setLoading(false);
            toast({ type: 'error', message: LOCALES.APP.POSTS.TOAST.NOT_LOGGED });
          }
        } catch (e) {
          setLoading(false);
          toast({ type: 'error', message: LOCALES.APP.POSTS.TOAST.NOT_LOGGED });
        }
      },
      () => {
        const errors = form.formState.errors;
        if (errors.title) {
          toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.TITLE_REQUIRED });
        } else if (errors.content) {
          toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.CONTENT_REQUIRED });
        } else if (errors.place) {
          toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.LOCATION_REQUIRED });
        } else if (errors.date) {
          toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.DATE_REQUIRED });
        } else {
          toast({ type: 'error', message: LOCALES.APP.POSTS.VALIDATION.FIELDS_REQUIRED });
        }
      },
    )(e);
  };

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.MAP_LOCATION_SELECT, MODALS.TRIP_SELECT]);
  }, []);


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
                    zoom={map.zoom}
                    center={map.marker}
                    marker={map.marker}
                    overlay={waypoint ? false : true}
                    onClick={handleLocationPickModal}
                  />
                </div>

                {waypoint && (
                  <div className="flex flex-row items-center justify-start gap-1 mb-4">
                    <MapPinIcon weight="bold" size={18} />
                    <span className="text-base font-medium">
                      {waypoint?.title ? `(${waypoint.title})` : ''}{' '}
                      {`[${waypoint.lon.toFixed(4)}, ${waypoint.lat.toFixed(4)}]`}
                    </span>
                  </div>
                )}
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
                          <Input disabled={loading} required {...field} />
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
                            date={form.watch('date')}
                            onChange={(date) => form.setValue('date', date)}
                            disabled={loading}
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
                          <Input disabled={loading} {...field} />
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
                              id="post-content-textarea"
                              className="min-h-[180px]"
                              disabled={loading}
                              {...field}
                              onPaste={aiDetection.trackPaste}
                              onChange={(e) => {
                                field.onChange(e);
                                aiDetection.analyzeText(e.target.value);
                              }}
                            />
                          </FormControl>
                          {aiDetection.hasWarnings && (
                            <AIDetectionWarning
                              warnings={aiDetection.warnings}
                              onDismiss={aiDetection.clearWarnings}
                              className="mt-2"
                            />
                          )}
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
                    onChange={(files) => {
                      uploader.handleFileChange(files);
                      // Analyze new files for AI content
                      files.forEach((file) => {
                        if (file.file) {
                          imageAIDetection.analyzeImage(file.file);
                        }
                      });
                    }}
                    onLoad={uploader.handleFileLoad}
                    onRemove={(fileId) => {
                      // Find the file before removing it
                      const fileToRemove = uploader.files.find(f => f.id === fileId);
                      uploader.handleFileRemove(fileId);
                      // Clear AI detection results for removed file
                      if (fileToRemove?.file?.name) {
                        imageAIDetection.clearResult(fileToRemove.file.name);
                      }
                    }}
                  />
                  {/* Display image AI detection warnings */}
                  {uploader.files.map((file) => {
                    if (!file.file?.name) return null;
                    const warnings = imageAIDetection.getWarningsForFile(file.file.name);
                    if (warnings.length === 0) return null;
                    
                    return (
                      <AIDetectionWarning
                        key={file.file.name}
                        warnings={warnings.map(warning => `${file.file?.name}: ${warning}`)}
                        onDismiss={() => file.file?.name && imageAIDetection.clearResult(file.file.name)}
                        className="mt-2"
                      />
                    );
                  })}
                </FormItem>
              </CardContent>
            </Card>

            {/* Section 5: Confirm Privacy and Log Entry */}
            <Card>
              <CardHeader>
                <CardTitle>Confirm Privacy and Log Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-row justify-start items-center gap-14">
                  <FormControl>
                    <FormItem>
                      <FormLabel>Public</FormLabel>
                      <Switch
                        checked={privacy.public}
                        aria-readonly
                        disabled={loading || privacy.sponsored}
                        onCheckedChange={(checked) => {
                          setPrivacy((prev) => ({ 
                            ...prev, 
                            public: checked,
                            // If making private, also disable sponsored
                            sponsored: checked ? prev.sponsored : false
                          }));
                        }}
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
                          disabled={loading || !privacy.public}
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
                <div className="mt-6">
                  <Button
                    type="submit"
                    className="min-w-[140px]"
                    loading={loading}
                  >
                    {privacy.public ? 'Log Entry' : 'Log Private Entry'}
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
