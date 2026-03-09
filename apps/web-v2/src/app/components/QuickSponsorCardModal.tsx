'use client';

import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { useStripe, useElements, CardElement } from '@/app/context/StripeContext';
import { sponsorshipApi } from '@/app/services/api';
import { toast } from 'sonner';

interface QuickSponsorCardModalProps {
  clientSecret: string;
  entryPublicId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function QuickSponsorCardModal({
  clientSecret,
  entryPublicId,
  onSuccess,
  onClose,
}: QuickSponsorCardModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setIsLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Card element not found');
        setIsLoading(false);
        return;
      }

      // Confirm the SetupIntent to save the card
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        { payment_method: { card: cardElement } },
      );

      if (stripeError) {
        setError(stripeError.message || 'Card setup failed');
        setIsLoading(false);
        return;
      }

      if (setupIntent?.status !== 'succeeded') {
        setError('Card setup was not completed');
        setIsLoading(false);
        return;
      }

      // Now confirm the quick sponsor with the saved card
      const result = await sponsorshipApi.confirmQuickSponsor(
        setupIntent.id,
        entryPublicId,
      );

      if (result.success) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
      toast.error(err.message || 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[#202020]/60" onClick={onClose} />
      <div className="relative w-[90%] max-w-md bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
        <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center gap-3">
          <CreditCard size={18} />
          <h3 className="text-sm font-bold">Add payment method</h3>
        </div>
        <div className="p-6">
          <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
            Add a card to complete your $3.00 sponsorship. Your card will be saved for future transactions.
          </p>

          <div className="border-2 border-[#202020] dark:border-[#616161] p-3 mb-4">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '14px',
                    fontFamily: 'Jost, system-ui, sans-serif',
                    color: '#202020',
                    '::placeholder': { color: '#b5bcc4' },
                  },
                },
              }}
            />
          </div>

          {error && (
            <p className="text-xs text-[#994040] mb-3">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-xs font-bold"
            >
              CANCEL
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !stripe}
              className="flex-1 px-4 py-2.5 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              SAVE CARD & SPONSOR $3.00
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
