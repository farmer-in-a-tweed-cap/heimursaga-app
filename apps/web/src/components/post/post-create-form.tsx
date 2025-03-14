'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
} from '@repo/ui/components';
import { Link } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { fieldmsg } from '@/lib/utils';

import { MapDialog } from '@/components/dialog';

import { Map } from '@/components';
import { useMapbox } from '@/hooks/use-mapbox';
import { ROUTER } from '@/router';

const schema = z.object({
  title: z
    .string()
    .nonempty(fieldmsg.required('title'))
    .min(10, fieldmsg.min('title', 10))
    .max(50, fieldmsg.max('title', 50)),
  content: z
    .string()
    .nonempty(fieldmsg.required('content'))
    .min(2, fieldmsg.min('content', 25))
    .max(3000, fieldmsg.max('content', 3000)),
});

export const PostCreateForm = () => {
  const mapbox = useMapbox();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: 'It is a long established fact',
      content:
        "Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).",
    },
  });

  const [loading, setLoading] = useState<boolean>(false);

  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
    alt: number;
    marker?: {
      lat: number;
      lon: number;
    };
  }>({
    lat: 48,
    lon: 17,
    alt: 5,
  });

  const handleLocationChange = (location: {
    lat: number;
    lon: number;
    alt: number;
    marker?: {
      lat: number;
      lon: number;
    };
  }) => {
    const { lat, lon, alt, marker } = location;

    setLocation((location) => ({
      ...location,
      lat,
      lon,
      alt,
      marker,
    }));
  };

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      setLoading(true);

      const { lat, lon } = location;

      console.log({
        ...values,
        lat,
        lon,
      });

      // await mutation.mutate(values);

      setTimeout(() => {
        setLoading(false);
      }, 500);
    },
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4">
        {JSON.stringify({ location })}
        <div>
          <Dialog>
            <DialogTrigger asChild>
              {mapbox.token && (
                <div className="relative w-full aspect-5/2 rounded-xl overflow-hidden">
                  <div className="absolute z-20 transition-all inset-0 w-full h-full flex flex-row justify-center items-center opacity-0 cursor-pointer hover:opacity-100">
                    <div className="absolute z-10 inset-0 bg-gray-200 opacity-50"></div>
                    <Button variant="outline" className="z-20">
                      Open map
                    </Button>
                  </div>
                  <Map
                    token={mapbox.token}
                    marker={location.marker}
                    coordinates={{
                      lat: location.lat,
                      lon: location.lon,
                      alt: location.alt,
                    }}
                    sources={[]}
                    cursor="pointer"
                    controls={false}
                    disabled={true}
                    className="z-10"
                  />
                </div>
              )}
            </DialogTrigger>
            <MapDialog
              marker={location.marker}
              coordinates={{
                lat: location.lat,
                lon: location.lon,
                alt: location.alt,
              }}
              onSubmit={handleLocationChange}
            />
          </Dialog>
        </div>
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
                          <Input disabled={loading} required {...field} />
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
                            disabled={loading}
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <Button
                    type="submit"
                    className="min-w-[180px]"
                    loading={loading}
                  >
                    Post
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
