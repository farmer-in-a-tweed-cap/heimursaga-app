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
  AIDetectionWarning,
} from '@/components';
import { MapLocationPickModalProps } from '@/components';
import { APP_CONFIG } from '@/config';
import { FILE_ACCEPT } from '@/constants';
import { useAIDetection, useImageAIDetection, useMap, useModal, useSession, useUploads, useCacheRefresh } from '@/hooks';
import { dateformat, normalizeText, redirect, zodMessage } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

const schema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(50, 'Title must not exceed 50 characters'),
  content: z
    .string()
    .min(1, 'Content is required')
    .refine((content) => {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      
      // We'll handle public vs private validation in the component
      return wordCount <= 1000;
    }, { message: 'Content must not exceed 1000 words' }),
  place: z
    .string()
    .min(1, 'Place is required')
    .max(50, 'Place must not exceed 50 characters'),
  date: z.date({ required_error: 'Date is required' }),
  journeyId: z.string().optional(),
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
  const { refreshAfterPostUpdate } = useCacheRefresh();

  // Helper function to show validation error toasts
  const showValidationError = (errors: any) => {
    if (errors.title) {
      toast({ type: 'error', message: errors.title.message || 'Title is required' });
    } else if (errors.content) {
      toast({ type: 'error', message: errors.content.message || 'Content is required' });
    } else if (errors.place) {
      toast({ type: 'error', message: errors.place.message || 'Place is required' });
    } else if (errors.date) {
      toast({ type: 'error', message: errors.date.message || 'Date is required' });
    } else {
      toast({ type: 'error', message: 'Please fix the form errors and try again' });
    }
  };

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

  // AI Content Detection
  const aiDetection = useAIDetection('post-edit-content-textarea', {
    enabled: true,
    checkPaste: true,
    checkAIphrases: true,
    debounceMs: 2000,
  });

  // Image AI Detection
  const imageAIDetection = useImageAIDetection();

  const [loading, setLoading] = useState<{
    post: boolean;
    delete: boolean;
  }>({
    post: false,
    delete: false,
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
    mode: 'onChange', // Validate on change for real-time feedback
  });

  // Auto-save is disabled for edit forms to prevent issues with published entries

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
    // Simply remove the trip from local state
    // The actual removal will happen during form submission
    setTrip(null);
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

  const handlePrivacyChange = (payload: {
    sponsored?: boolean;
    public?: boolean;
  }) => {
    // Apply toggle interdependency logic without API calls
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
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postId) return;

    // Check if uploads are still in progress
    const pendingUploads = uploader.files.filter(file => file.file && !file.uploadId && file.loading !== false);
    if (pendingUploads.length > 0) {
      toast({ type: 'error', message: 'Please wait for photo uploads to complete' });
      return;
    }

    // Check map marker
    if (!map.marker) {
      toast({ type: 'error', message: 'Please select a location on the map' });
      return;
    }

    const formData = form.getValues();
    const { title, content, place, date } = formData;
    
    // Custom validation for public entries
    if (privacy.public && content) {
      const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount < 100) {
        toast({ type: 'error', message: 'Public entries must be at least 100 words' });
        return;
      }
    }

    // Trigger form validation and show toast for errors
    const isValid = await form.trigger();
    if (!isValid) {
      showValidationError(form.formState.errors);
      return;
    }

    try {
      const tripId = trip?.id;
      const { marker } = map;

      const uploads: string[] = uploader.files
        .map(({ uploadId }) => uploadId)
        .filter((el): el is string => typeof el === 'string' && el.length > 0);

      setLoading({ ...loading, post: true });

      const updatePayload = {
        title,
        content: content || (privacy.public ? content : ' '), // Private entries can have minimal content
        place,
        date,
        public: privacy.public,
        sponsored: privacy.sponsored,
        isDraft: false, // Publishing the entry
        waypoint: {
          lat: marker?.lat,
          lon: marker?.lon,
        },
        tripId,
        uploads,
      };

      // update the post
      const { success } = await apiClient.updatePost({
        query: { id: postId },
        payload: updatePayload,
      });

      if (success) {
        // Use centralized cache refresh for post updates
        await refreshAfterPostUpdate(postId);
        
        // Show success toast
        toast({
          type: 'success',
          message: 'Entry saved',
        });
        
        setLoading({ ...loading, post: false });
      } else {
        toast({
          type: 'error',
          message: 'Failed to save entry. Please try again.',
        });
        setLoading({ ...loading, post: false });
      }
    } catch (e) {
      toast({
        type: 'error',
        message: 'Something went wrong. Please try again.',
      });
      setLoading({ post: false, delete: false });
    }
  };

  const handleDelete = () => {
    if (!postId) return;

    modal.open(MODALS.DELETE_CONFIRMATION, {
      full: false,
      props: {
        title: 'Delete Entry',
        message: 'Are you sure you want to delete this journal entry? This will permanently remove the entry and all associated data.',
        itemType: 'entry',
        isLoading: loading.delete,
        onConfirm: handleDeleteConfirmed,
      },
    });
  };

  const handleDeleteConfirmed = async () => {
    if (!postId) return;

    try {
      setLoading({ ...loading, delete: true });

      const { success } = await apiClient.deletePost({
        query: { postId },
      });

      if (success) {
        // Use centralized cache refresh for post deletion
        await refreshAfterPostUpdate(postId);
        
        toast({
          type: 'success',
          message: 'Entry deleted successfully',
        });

        // Redirect to user's profile page
        const username = session.username;
        if (username) {
          redirect(ROUTER.USERS.DETAIL(username));
        } else {
          redirect(ROUTER.HOME);
        }
      } else {
        toast({
          type: 'error',
          message: 'Failed to delete entry. Please try again.',
        });
        setLoading({ ...loading, delete: false });
      }
    } catch (e) {
      toast({
        type: 'error',
        message: 'Something went wrong. Please try again.',
      });
      setLoading({ ...loading, delete: false });
    }
  };

  // cache modals
  useEffect(() => {
    modal.preload([MODALS.TRIP_SELECT, MODALS.MAP_LOCATION_SELECT, MODALS.DELETE_CONFIRMATION]);
  }, [modal.preload]);

  // Watch for form validation errors and show toast when fields lose focus
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        // Clear any previous errors for this field when user starts typing
        const fieldName = name as keyof typeof form.formState.errors;
        if (fieldName && form.formState.errors[fieldName]) {
          form.clearErrors(fieldName);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

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
                    loading={loading.post}
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
                            <Input 
                              disabled={loading.post || loading.delete} 
                              {...field} 
                              onBlur={async (e) => {
                                field.onBlur();
                                const isFieldValid = await form.trigger('title');
                                if (!isFieldValid && form.formState.errors.title) {
                                  toast({ 
                                    type: 'error', 
                                    message: form.formState.errors.title.message || 'Title is required' 
                                  });
                                }
                              }}
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
                          <p className="text-xs text-gray-500 mb-2">date of occurrence - may be different from the date you log the entry</p>
                          <FormControl>
                            <DatePicker
                              format={(date) =>
                                dateformat(date).format('MMM DD, YYYY')
                              }
                              date={field.value}
                              onChange={field.onChange}
                              disabled={loading.post || loading.delete}
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
                            <Input 
                              disabled={loading.post || loading.delete} 
                              {...field} 
                              onBlur={async (e) => {
                                field.onBlur();
                                const isFieldValid = await form.trigger('place');
                                if (!isFieldValid && form.formState.errors.place) {
                                  toast({ 
                                    type: 'error', 
                                    message: form.formState.errors.place.message || 'Place is required' 
                                  });
                                }
                              }}
                            />
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
                          if (!privacy.public) return 'text-gray-400'; // Private entries - no color coding
                          if (wordCount < 100) return 'text-red-400';
                          if (wordCount > 1000) return 'text-red-400';
                          if (wordCount > 900) return 'text-orange-400';
                          return 'text-green-400';
                        };

                        return (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel>Tell your story</FormLabel>
                              <span className={`text-xs ${getWordCountColor()}`}>
                                {wordCount} {privacy.public ? '/ 1000 words' : 'words'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">
                              {privacy.public ? 'Public entries: 100-1,000 words' : 'Private entries: any length'}
                            </p>
                            <FormControl>
                              <Textarea
                                id="post-edit-content-textarea"
                                className="min-h-[180px]"
                                disabled={loading.post || loading.delete}
                                {...field}
                                onPaste={aiDetection.trackPaste}
                                onChange={(e) => {
                                  field.onChange(e);
                                  aiDetection.analyzeText(e.target.value);
                                }}
                                onBlur={async (e) => {
                                  field.onBlur();
                                  const content = e.target.value;
                                  
                                  // Custom validation for public entries
                                  if (privacy.public && content) {
                                    const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
                                    if (wordCount < 100) {
                                      toast({ type: 'error', message: 'Public entries must be at least 100 words' });
                                      return;
                                    }
                                  }
                                  
                                  const isFieldValid = await form.trigger('content');
                                  if (!isFieldValid && form.formState.errors.content) {
                                    toast({ 
                                      type: 'error', 
                                      message: form.formState.errors.content.message || 'Content is required' 
                                    });
                                  }
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
                        disabled={loading.post || loading.delete || privacy.sponsored}
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
                          disabled={loading.post || loading.delete || !privacy.public}
                          onCheckedChange={(checked) =>
                            handlePrivacyChange({ sponsored: checked })
                          }
                        />
                      </FormItem>
                    </FormControl>
                  )}
                </div>
                <div className="mt-6 flex gap-3 items-center flex-wrap">
                  <Button
                    type="submit"
                    className="min-w-[140px]"
                    loading={loading.post}
                    disabled={loading.delete}
                  >
                    {values?.isDraft 
                      ? (privacy.public ? 'Publish Entry' : 'Publish Private Entry')
                      : (privacy.public ? 'Save Entry' : 'Save Private Entry')
                    }
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-w-[140px]"
                    loading={loading.delete}
                    disabled={loading.post || loading.delete}
                    onClick={handleDelete}
                  >
                    Delete Entry
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
