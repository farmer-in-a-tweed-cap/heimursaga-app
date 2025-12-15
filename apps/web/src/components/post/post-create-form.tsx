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
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { DraftRecoveryModalProps } from '@/components/draft/draft-recovery-modal';
import { APP_CONFIG } from '@/config';
import { FILE_ACCEPT } from '@/constants';
import { useAIDetection, useAutoSave, useImageAIDetection, useMap, useModal, useScroll, useSession, useUploads } from '@/hooks';
import { dateformat, redirect, zodMessage } from '@/lib';
import { LOCALES } from '@/locales';
import { ROUTER } from '@/router';

const schema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(75, 'Title must not exceed 75 characters'),
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
  const queryClient = useQueryClient();

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

  const [loading, setLoading] = useState<boolean>(false);
  const [draftPostId, setDraftPostId] = useState<string | null>(null);
  const [trip, setTrip] = useState<{ id: string; title: string } | null>(null);
  const [showDraftModal, setShowDraftModal] = useState<boolean>(false);
  
  const [privacy, setPrivacy] = useState<{
    public: boolean;
    sponsored: boolean;
  }>({
    public: true,
    sponsored: false,
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      place: '',
      date: new Date(),
    },
    mode: 'onChange', // Validate on change for real-time feedback
  });

  const map = useMap({
    marker: waypoint ? { lat: waypoint.lat, lon: waypoint.lon } : undefined,
    center: waypoint ? { lat: waypoint.lat, lon: waypoint.lon } : undefined,
    zoom: waypoint ? APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM : 0,
  });


  // Watch form values for auto-save
  const watchedValues = form.watch();

  const uploader = useUploads({
    maxFiles: session.creator ? 3 : 1,
    maxSize: APP_CONFIG.UPLOAD.MAX_FILE_SIZE,
  });

  // Process uploads for auto-save
  const uploadsForAutoSave = uploader.files
    .map(({ uploadId }) => uploadId)
    .filter((el): el is string => typeof el === 'string' && el.length > 0);

  // Auto-save hook
  const autoSave = useAutoSave({
    postId: draftPostId || undefined,
    data: {
      title: watchedValues.title,
      content: watchedValues.content,
      place: watchedValues.place,
      date: watchedValues.date,
      public: privacy.public,
      sponsored: privacy.sponsored,
      lat: map.marker?.lat,
      lon: map.marker?.lon,
      waypointId: waypoint?.id,
      tripId: trip?.id,
      uploads: uploadsForAutoSave,
      uploadCaptions: uploader.files.reduce((acc, file) => {
        if (file.uploadId && file.caption && file.caption.trim()) {
          acc[file.uploadId] = file.caption.trim();
        }
        return acc;
      }, {} as { [uploadId: string]: string }),
    },
    enabled: session.logged, // Only enable auto-save when logged in
    onDraftCreated: setDraftPostId,
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

  // Check for existing drafts on component mount
  const { data: draftsResponse, isLoading: draftsLoading, error: draftsError } = useQuery({
    queryKey: [API_QUERY_KEYS.USER_DRAFTS],
    queryFn: () => apiClient.getDrafts(),
    enabled: session.logged && !draftPostId, // Wait for session to be logged in
    retry: 1, // Retry once if it fails
  });


  // Show draft recovery modal if drafts exist
  useEffect(() => {
    const draftsList = draftsResponse?.data?.data || [];
    if (session.logged && Array.isArray(draftsList) && draftsList.length > 0 && !draftPostId && !showDraftModal) {
      modal.open<DraftRecoveryModalProps>(MODALS.DRAFT_RECOVERY, {
        full: false,
        props: {
          onDraftSelected: handleDraftSelected,
          drafts: draftsList as any,
        },
      });
      setShowDraftModal(true); // Prevent multiple modals
    }
  }, [draftsResponse, draftPostId, showDraftModal, modal, session.logged]);

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

  const handleDraftSelected = async (draftId: string) => {
    try {
      // Fetch the draft details to populate the form
      const { data: draftData } = await apiClient.getPostById({ query: { id: draftId } });
      
      if (draftData) {
        // Populate form with draft data
        form.reset({
          title: draftData.title || '',
          content: draftData.content || '',
          place: draftData.place || '',
          date: draftData.date ? new Date(draftData.date) : new Date(),
        });

        // Set privacy settings
        setPrivacy({
          public: draftData.public || false,
          sponsored: draftData.sponsored || false,
        });

        // Set map marker if waypoint exists
        if (draftData.waypoint) {
          map.setMarker({
            lat: draftData.waypoint.lat,
            lon: draftData.waypoint.lon,
          });
          map.setCenter({
            lat: draftData.waypoint.lat,
            lon: draftData.waypoint.lon,
          });
          map.setZoom(APP_CONFIG.MAP.DEFAULT.PREVIEW.ZOOM);
        }

        // Set trip if exists
        if (draftData.trip) {
          setTrip({
            id: draftData.trip.id,
            title: draftData.trip.title,
          });
        }

        // Restore uploaded photos from draft
        if (draftData.media && draftData.media.length > 0) {
          const restoredFiles = draftData.media.map((mediaItem, index) => ({
            id: Date.now() + index, // Generate unique integer ID for uploader
            uploadId: mediaItem.id,
            src: mediaItem.thumbnail,
            file: undefined, // No original file since it's already uploaded
            loading: false,
            caption: mediaItem.caption || undefined,
          }));
          
          // Reset the uploader with the restored files
          uploader.setFiles(restoredFiles);
        }

        // Set the draft ID so we know to update instead of create
        setDraftPostId(draftId);
      }
    } catch (error) {
      toast({ type: 'error', message: 'Failed to load draft' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = form.getValues();
    const { title, content, place, date } = formData;
    
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

      // Collect captions for uploads
      const uploadCaptions: { [uploadId: string]: string } = {};
      uploader.files.forEach(file => {
        if (file.uploadId && file.caption && file.caption.trim()) {
          uploadCaptions[file.uploadId] = file.caption.trim();
        }
      });

      setLoading(true);

      if (draftPostId) {
        // Update existing draft to publish it
        const { success } = await apiClient.updatePost({
          query: { id: draftPostId },
          payload: {
            title,
            content: content || ' ',
            place,
            date,
            public: privacy.public,
            sponsored: privacy.sponsored,
            waypoint: {
              lat: marker?.lat,
              lon: marker?.lon,
            },
            tripId,
            uploads,
            uploadCaptions,
            isDraft: false, // Publishing the draft
          },
        });

        if (success) {
          redirect(ROUTER.ENTRIES.DETAIL(draftPostId));
        } else {
          setLoading(false);
          toast({ type: 'error', message: 'Failed to publish entry. Please try again.' });
        }
      } else {
        // Create a new published post
        const { success, data } = await apiClient.createPost({
          title,
          content: content || ' ',
          place,
          date,
          lat: marker?.lat,
          lon: marker?.lon,
          public: privacy.public,
          sponsored: privacy.sponsored,
          waypointId: waypoint?.id,
          uploads,
          uploadCaptions,
          tripId,
          isDraft: false, // Creating a published post
        });

        if (success) {
          const postId = data?.id;
          if (postId) {
            redirect(ROUTER.ENTRIES.DETAIL(postId));
          }
        } else {
          setLoading(false);
          toast({ type: 'error', message: 'Failed to create entry. Please try again.' });
        }
      }
    } catch (e) {
      setLoading(false);
      toast({ type: 'error', message: 'Something went wrong. Please try again.' });
    }
  };

  useEffect(() => {
    // cache modals
    modal.preload([MODALS.MAP_LOCATION_SELECT, MODALS.TRIP_SELECT]);
  }, []);

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
                    zoom={map.zoom}
                    center={map.center}
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
                        <p className="text-xs text-gray-400 mb-2">a unique and descriptive title</p>
                        <FormControl>
                          <Input 
                            disabled={loading} 
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
                        <p className="text-xs text-gray-400 mb-2">date of occurrence - may be different from the date you log the entry</p>
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
                        <p className="text-xs text-gray-400 mb-2">the place where it happened - the official name or your own name</p>
                        <FormControl>
                          <Input 
                            disabled={loading} 
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
                          <p className="text-xs text-gray-400 mb-2">
                            {privacy.public ? 'Public entries: 100-1,000 words' : 'Private entries: any length'}
                          </p>
                          <FormControl>
                            <Textarea
                              id="post-content-textarea"
                              className="min-h-[180px]"
                              disabled={loading}
                              {...field}
                              onPaste={aiDetection.trackPaste}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(e);
                                aiDetection.analyzeText(value);
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
                    onCaptionChange={uploader.handleCaptionChange}
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
                  {/* Auto-save status */}
                  <div className="mb-3 min-h-[20px]">
                    {autoSave.isAutoSaving ? (
                      <span className="text-xs text-gray-500">
                        Auto-saving...
                      </span>
                    ) : autoSave.lastSaveError ? (
                      <span className="text-xs text-red-500">
                        Auto-save failed
                      </span>
                    ) : draftPostId ? (
                      <span className="text-xs text-green-600">
                        Draft saved
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {/* Empty state - no status to show */}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-3 items-center flex-wrap">
                    <Button
                      type="submit"
                      className="min-w-[140px]"
                      loading={loading}
                    >
                      {draftPostId 
                        ? 'Publish Entry'
                        : 'Log Entry'
                      }
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>

    </div>
  );
};
