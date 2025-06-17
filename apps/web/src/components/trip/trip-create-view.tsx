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
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        const { title } = values;

        setLoading(true);

        // create a trip
        const { success, data } = await apiClient.createTrip({
          query: {},
          payload: { title },
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
    <div className="w-full h-full flex flex-row justify-between bg-white">
      <div className="w-full relative h-full hidden sm:flex overflow-hidden">
        <div className="basis-4/12 relative flex flex-col h-dvh">
          <div className="relative h-full flex flex-col justify-start items-start px-6 bg-white overflow-y-scroll">
            <div className="w-full h-full flex flex-col justify-between gap-10 box-border">
              <div className="flex flex-col gap-10">
                <div className="flex flex-col justify-start pt-6 items-start gap-2">
                  <h1 className="text-xl font-medium">Create a journey</h1>
                  {/* <span className="font-normal text-base text-gray-700">
                    Easily plan the perfect path for your next trip.
                  </span> */}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xl font-medium">Journey</h2>
                  <div className="mt-6 flex flex-col gap-6">
                    <Form {...form}>
                      <form onSubmit={handleSubmit}>
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
                      </form>
                    </Form>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 left-0 right-0 flex flex-col bg-background py-4 box-border">
                <Button size="lg" loading={loading} onClick={handleSubmit}>
                  Create
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'basis-8/12 z-40 relative overflow-hidden rounded-l-2xl',
          )}
        >
          <div className={cn('z-10 relative !w-full h-full overflow-hidden')}>
            {mapbox.token && <Map token={mapbox.token} sources={[]} />}
          </div>
        </div>
      </div>
    </div>
  );
};
