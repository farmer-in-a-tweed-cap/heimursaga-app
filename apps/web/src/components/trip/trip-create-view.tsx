'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ITripDetail } from '@repo/types';
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
} from '@repo/ui/components';
import { cn } from '@repo/ui/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import {
  MAP_SOURCES,
  Map,
  MapSourceData,
  TripWaypointCard,
  TripWaypointCardClickHandler,
  TripWaypointCreateForm,
  TripWaypointCreateFormSubmitHandler,
  TripWaypointEditForm,
  TripWaypointEditFormState,
} from '@/components';
import { useMapbox } from '@/hooks';
import { dateformat, zodMessage } from '@/lib';
import { ROUTER } from '@/router';

const schema = z.object({
  title: z
    .string()
    .nonempty(zodMessage.required('title'))
    .min(0, zodMessage.string.min('title', 0))
    .max(100, zodMessage.string.max('title', 100)),
  description: z.string().max(500, zodMessage.string.max('description', 500)),
  public: z.boolean(),
});

type Props = {};

export const TripCreateView: React.FC<Props> = () => {
  const mapbox = useMapbox();
  const router = useRouter();

  const [state, setState] = useState<{
    waypointCreating: boolean;
    waypointEditing: boolean;
    waypointEditingId?: string;
  }>({
    waypointCreating: false,
    waypointEditing: false,
  });

  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      public: true,
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { title, public: isPublic } = values;

        setLoading(true);

        // create a trip
        const { success, data } = await apiClient.createTrip({
          query: {},
          payload: { title, public: isPublic },
        });

        if (success) {
          const tripId = data?.tripId;
          if (tripId) {
            router.push(ROUTER.JOURNEYS.DETAIL(tripId));
          }
        } else {
          setLoading(false);
        }
      } catch (e) {
        setLoading(false);
      }
    },
  );

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Create a Journey</h1>
        </div>
        
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter journey title"
                      disabled={loading} 
                      required 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="public"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Public</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              size="lg" 
              className="w-full" 
              loading={loading}
            >
              Create Journey
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};
