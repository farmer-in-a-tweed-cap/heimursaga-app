'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  DatePicker,
  // DatePicker,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@repo/ui/components';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { dateformat, zodMessage } from '@/lib';

type Props = {
  onSubmit?: TripWaypointCreateFormSubmitHandler;
  onCancel?: () => void;
};

export type TripWaypointCreateFormSubmitHandler = (values: {
  title: string;
  lat: number;
  lon: number;
  date: Date;
}) => void;

const schema = z.object({
  title: z
    .string()
    .nonempty(zodMessage.required('title'))
    .min(2, zodMessage.string.min('title', 2))
    .max(20, zodMessage.string.max('title', 20)),
  lat: z.string().max(20, zodMessage.string.max('latitude', 20)),
  lon: z.string().max(20, zodMessage.string.max('longitude', 20)),
  date: z.date(),
});

export const TripWaypointCreateForm: React.FC<Props> = ({
  onSubmit,
  onCancel,
}) => {
  const [loading, setLoading] = useState<boolean>(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      lat: '0',
      lon: '0',
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        setLoading(true);

        const { title, lat, lon, date } = values;

        // @todo
        // if (success) {
        // } else {
        //   setLoading(false);
        // }

        if (onSubmit) {
          onSubmit({
            title,
            lat: parseFloat(lat),
            lon: parseFloat(lon),
            date,
          });
        }
      } catch (e) {
        setLoading(false);
      }
    },
  );

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-6">
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

          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="lat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl>
                    <Input disabled={loading} required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl>
                    <Input disabled={loading} required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <DatePicker
                    format={(date) => dateformat(date).format('MMM DD, YYYY')}
                    date={form.watch('date')}
                    onChange={(date) => form.setValue('date', date)}
                    inputProps={{
                      name: field.name,
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-6 flex flex-row justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Submit
          </Button>
        </div>
      </form>
    </Form>
  );
};
