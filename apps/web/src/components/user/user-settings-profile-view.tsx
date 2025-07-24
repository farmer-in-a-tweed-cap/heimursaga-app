'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { IUserSettingsProfileGetResponse, UserRole } from '@repo/types';
import {
  Button,
  Card,
  CardContent,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

import { API_QUERY_KEYS, apiClient } from '@/lib/api';

import { zodMessage } from '@/lib';
import { useSession } from '@/hooks';

import { UserAvatarUploadPicker } from './user-avatar-upload-picker';

const schema = z.object({
  // name: z
  //   .string()
  //   .nonempty(zodMessage.required('name'))
  //   .min(2, zodMessage.string.min('name', 2))
  //   .max(50, zodMessage.string.max('name', 20)),
  username: z
    .string()
    .nonempty(zodMessage.required('username'))
    .min(4, zodMessage.string.min('username', 4))
    .max(20, zodMessage.string.max('username', 20)),
  email: z
    .string()
    .email(zodMessage.email())
    .nonempty(zodMessage.required('email'))
    .max(50, zodMessage.string.max('email', 50)),
  bio: z
    .string()
    .nonempty(zodMessage.required('bio'))
    .min(0, zodMessage.string.min('bio', 0))
    .max(140, zodMessage.string.max('bio', 140)),
  location_lives: z
    .string()
    .min(0, zodMessage.string.min('currently', 0))
    .max(50, zodMessage.string.max('currently', 50))
    .optional(),
  location_from: z
    .string()
    .min(0, zodMessage.string.min('from', 0))
    .max(50, zodMessage.string.max('from', 50))
    .optional(),
  sponsors_fund: z
    .string()
    .min(0, zodMessage.string.min('sponsors fund', 0))
    .max(500, zodMessage.string.max('sponsors fund', 500))
    .optional(),
  sponsors_fund_type: z
    .enum(['journey', 'custom'])
    .optional(),
  sponsors_fund_journey_id: z
    .string()
    .optional(),
});

type Props = {
  data?: IUserSettingsProfileGetResponse;
};

export const UserSettingsProfileView: React.FC<Props> = ({ data }) => {
  const router = useRouter();
  const toast = useToast();
  const session = useSession();

  const [loading, setLoading] = useState<{
    picture: boolean;
    settings: boolean;
  }>({ picture: false, settings: false });

  // Always show sponsors_fund field for creators in settings
  const isCreator = session?.role === UserRole.CREATOR;
  const shouldShowSponsorsFund = isCreator;

  // Debug: Check what data is being loaded
  console.log('Profile data loaded:', {
    sponsorsFund: data?.sponsorsFund,
    sponsorsFundType: data?.sponsorsFundType,
    sponsorsFundJourneyId: data?.sponsorsFundJourneyId
  });

  // Fetch user's journeys for the dropdown
  const journeysQuery = useQuery({
    queryKey: [API_QUERY_KEYS.TRIPS],
    queryFn: () => apiClient.getTrips().then(({ data }) => data),
    enabled: shouldShowSponsorsFund,
    retry: 0,
  });

  const journeys = journeysQuery.data?.data || [];

  // Smart detection of journey vs custom mode
  const detectJourneyMode = (): { type: 'journey' | 'custom'; journeyId: string } => {
    console.log('detectJourneyMode called:', {
      sponsorsFundType: data?.sponsorsFundType,
      sponsorsFund: data?.sponsorsFund,
      journeysLength: journeys.length,
      journeys: journeys.map(j => j.title)
    });

    if (data?.sponsorsFundType && (data.sponsorsFundType === 'journey' || data.sponsorsFundType === 'custom')) {
      return {
        type: data.sponsorsFundType as 'journey' | 'custom',
        journeyId: data.sponsorsFundJourneyId || '',
      };
    }
    
    // Fallback: check if the sponsors fund text matches any journey title
    if (data?.sponsorsFund && journeys.length > 0) {
      const matchingJourney = journeys.find(j => j.title === data.sponsorsFund);
      console.log('Looking for matching journey:', { sponsorsFund: data.sponsorsFund, matchingJourney });
      if (matchingJourney) {
        return {
          type: 'journey',
          journeyId: matchingJourney.id,
        };
      }
    }
    
    return {
      type: 'custom',
      journeyId: '',
    };
  };

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: data
      ? {
          email: data.email,
          username: data.username,
          // name: data.name,
          bio: data.bio,
          location_from: data.locationFrom,
          location_lives: data.locationLives,
          sponsors_fund: data.sponsorsFund || '',
          sponsors_fund_type: 'custom', // Start with custom, will be updated by useEffect
          sponsors_fund_journey_id: '',
        }
      : {
          // name: '',
          bio: '',
          location_from: '',
          location_lives: '',
          sponsors_fund: '',
          sponsors_fund_type: 'custom',
          sponsors_fund_journey_id: '',
        },
  });

  // Update form values once journeys are loaded and we can properly detect the mode
  React.useEffect(() => {
    if (journeys.length > 0 && data) {
      const journeyMode = detectJourneyMode();
      console.log('Setting form values based on detection:', journeyMode);
      
      form.setValue('sponsors_fund_type', journeyMode.type);
      form.setValue('sponsors_fund_journey_id', journeyMode.journeyId);
    }
  }, [journeys.length, data, form]);

  // Watch the sponsors fund type to conditionally show fields
  const sponsorsFundType = useWatch({
    control: form.control,
    name: 'sponsors_fund_type',
    defaultValue: 'custom',
  });

  // Watch the selected journey to update sponsors fund text
  const selectedJourneyId = useWatch({
    control: form.control,
    name: 'sponsors_fund_journey_id',
  });

  // Update sponsors_fund when journey is selected
  React.useEffect(() => {
    if (sponsorsFundType === 'journey' && selectedJourneyId) {
      const selectedJourney = journeys.find(j => j.id === selectedJourneyId);
      if (selectedJourney) {
        const journeyText = `${selectedJourney.title}`;
        form.setValue('sponsors_fund', journeyText);
      }
    }
  }, [sponsorsFundType, selectedJourneyId, journeys, form]);

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { bio, location_from, location_lives, sponsors_fund, sponsors_fund_type, sponsors_fund_journey_id } = values;

        console.log('Form submission values:', { sponsors_fund, sponsors_fund_type, sponsors_fund_journey_id });

        setLoading((loading) => ({ ...loading, settings: true }));

        // save the changes
        const { success } = await apiClient.updateUserProfileSettings({
          query: {},
          payload: {
            bio,
            from: location_from,
            livesIn: location_lives,
            sponsorsFund: sponsors_fund,
            sponsorsFundType: sponsors_fund_type,
            sponsorsFundJourneyId: sponsors_fund_journey_id,
          },
        });

        if (success) {
          toast({ type: 'success', message: 'settings updated' });
          router.refresh();
        } else {
          toast({ type: 'error', message: 'settings not updated' });
        }

        setLoading((loading) => ({ ...loading, settings: false }));
      } catch (e) {
        setLoading((loading) => ({ ...loading, settings: false }));
        toast({ type: 'error', message: 'settings not updated' });
      }
    },
  );

  const handlePictureUpdate = async (file: File) => {
    try {
      setLoading((loading) => ({ ...loading, picture: true }));

      // save the changes
      await apiClient.updateUserPicture({ file });

      setLoading((loading) => ({ ...loading, picture: false }));
    } catch (e) {
      setLoading((loading) => ({ ...loading, picture: false }));
    }
  };

  return (
    <Card className={cn('flex flex-col gap-6')}>
      <CardContent>
        <UserAvatarUploadPicker
          src={data?.picture}
          loading={loading.picture}
          fallback={data?.username}
          onChange={handlePictureUpdate}
        />
        <Form {...form}>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="mt-8 gap-6 flex flex-col">
                <div className="w-full flex lg:flex-row flex-col gap-6">
                  <div className="basis-6/12 lg:basis-full">
                    <FormField
                      control={form.control}
                      name="email"
                      disabled
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="basis-6/12 lg:basis-full">
                    <FormField
                      control={form.control}
                      name="username"
                      disabled
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input required {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                {/* <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading.settings}
                          required
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="location_from"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From</FormLabel>
                        <FormControl>
                          <Input disabled={loading.settings} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location_lives"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currently</FormLabel>
                        <FormControl>
                          <Input disabled={loading.settings} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[120px]"
                            disabled={loading.settings}
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {shouldShowSponsorsFund && (
                  <div className="grid gap-4">
                    <div>
                      <FormLabel className="text-base font-medium">Sponsors Fund</FormLabel>
                      <p className="text-sm text-gray-600 mt-1">Tell sponsors how their support will be used</p>
                    </div>
                    
                    {/* Type Selection */}
                    <FormField
                      control={form.control}
                      name="sponsors_fund_type"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="type-journey"
                                value="journey"
                                checked={field.value === 'journey'}
                                onChange={() => field.onChange('journey')}
                                className="h-4 w-4"
                                style={{ accentColor: 'rgb(170, 108, 70)' }}
                              />
                              <label htmlFor="type-journey" className="text-sm font-medium">
                                Specific Journey
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id="type-custom"
                                value="custom"
                                checked={field.value === 'custom'}
                                onChange={() => field.onChange('custom')}
                                className="h-4 w-4"
                                style={{ accentColor: 'rgb(170, 108, 70)' }}
                              />
                              <label htmlFor="type-custom" className="text-sm font-medium">
                                Custom Message
                              </label>
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Journey Selection */}
                    {sponsorsFundType === 'journey' && (
                      <FormField
                        control={form.control}
                        name="sponsors_fund_journey_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Journey</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a journey" />
                                </SelectTrigger>
                                <SelectContent>
                                  {journeys.map((journey) => (
                                    <SelectItem key={journey.id} value={journey.id}>
                                      {journey.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Custom Message */}
                    {sponsorsFundType === 'custom' && (
                      <FormField
                        control={form.control}
                        name="sponsors_fund"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Message</FormLabel>
                            <FormControl>
                              <Textarea
                                className="min-h-[80px]"
                                disabled={loading.settings}
                                placeholder="Tell sponsors how their support will be used..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}
              </div>
              <div>
                <Button type="submit" loading={loading.settings}>
                  Save
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
