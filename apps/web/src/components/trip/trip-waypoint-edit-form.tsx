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
} from '@repo/ui/components';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { dateformat, zodMessage } from '@/lib';

type Props = {
  defaultValues: Partial<TripWaypointEditFormState>;
  loading?: boolean;
  onSubmit?: TripWaypointEditFormSubmitHandler;
  onCancel?: () => void;
};

export type TripWaypointEditFormState = {
  title: string;
  lat: number;
  lon: number;
  date: Date;
};

export type TripWaypointEditFormSubmitHandler = (
  values: Partial<TripWaypointEditFormState>,
) => void;

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

export const TripWaypointEditForm: React.FC<Props> = ({
  loading = false,
  defaultValues,
  onSubmit,
  onCancel,
}) => {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title,
      lat: defaultValues?.lat
        ? parseFloat(`${defaultValues.lat}`).toString()
        : '0',
      lon: defaultValues?.lon
        ? parseFloat(`${defaultValues.lon}`).toString()
        : '0',
      date: defaultValues?.date,
    },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      const { title, lat, lon, date } = values;
      if (onSubmit) {
        onSubmit({
          title,
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          date,
        });
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
            Save
          </Button>
        </div>
      </form>
    </Form>
  );
};
