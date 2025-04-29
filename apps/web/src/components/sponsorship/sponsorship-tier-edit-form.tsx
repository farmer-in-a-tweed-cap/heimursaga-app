'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  Textarea,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiClient } from '@/lib/api';

import { zodMessage } from '@/lib';

const schema = z.object({
  price: z
    .number()
    .min(5, zodMessage.number.min('price', 5))
    .max(500, zodMessage.number.max('price', 500)),
  description: z
    .string()
    .nonempty(zodMessage.required('description'))
    .min(2, zodMessage.string.min('description', 5))
    .max(10, zodMessage.string.max('description', 100)),
});

type Props = {
  sponsorshipTierId?: string;
  defaultValues?: {
    price: number;
    description: string;
  };
  onSubmit?: SponsorshipTierEditFormSubmitHandler;
  onCancel?: () => void;
};

export type SponsorshipTierEditFormSubmitHandler = (data?: {
  price?: number;
  description?: string;
}) => void;

export const SponsorshipTierEditForm: React.FC<Props> = ({
  sponsorshipTierId,
  defaultValues,
  onSubmit,
  onCancel,
}) => {
  const toast = useToast();

  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues
      ? defaultValues
      : {
          price: 5,
          description: '',
        },
  });

  const handleSubmit = form.handleSubmit(
    async (values: z.infer<typeof schema>) => {
      try {
        if (!sponsorshipTierId) return;

        setLoading(true);

        const { price, description } = values;

        const sponsorshipTierUpdate = await apiClient.updateSponsorshipTierById(
          {
            query: { id: sponsorshipTierId },
            payload: {
              price,
              description,
            },
          },
        );

        if (!sponsorshipTierUpdate.success) {
          toast({ type: 'error', message: 'membership tier not updated' });
          return;
        }

        toast({ type: 'success', message: 'membership tier updated' });

        if (onSubmit) {
          onSubmit({
            price: form.getValues('price'),
            description: form.getValues('description'),
          });
        }

        setLoading(false);
      } catch (e) {
        toast({ type: 'error', message: 'membership tier not updated' });
        setLoading(false);
      }
    },
  );

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <div className="gap-6 flex flex-col">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly price</FormLabel>
                  <FormControl>
                    <NumberInput
                      //   min={5}
                      //   max={500}
                      maxLength={4}
                      leftElement="$"
                      required
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier description</FormLabel>
                  <FormControl>
                    <Textarea className="min-h-[80px]" required {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-6 flex flex-row gap-2">
            <Button type="submit" loading={loading}>
              Save
            </Button>
            <Button variant="outline" disabled={loading} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};
