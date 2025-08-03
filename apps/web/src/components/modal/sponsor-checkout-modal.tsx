'use client';

import {
  Button,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components';
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api';
import { SponsorCheckoutSummary, SponsorshipCheckoutForm, StripeProvider } from '@/components';
import { ROUTER } from '@/router';

import { ModalBaseProps } from './modal-provider';

type SponsorCheckoutModalProps = ModalBaseProps<{
  username: string;
  isEmailVerified?: boolean;
}>;

const SponsorCheckoutModal: React.FC<SponsorCheckoutModalProps> = ({
  props,
  close,
  onSubmit,
  onCancel,
}) => {
  const { username, isEmailVerified = true } = props || {};
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    sponsorship?: any;
    paymentMethods?: { id: string; label: string }[];
    creator?: any;
  }>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      
      // Don't fetch data if email is not verified
      if (!isEmailVerified) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        const [sponsorshipTierQuery, paymentMethodQuery, creatorQuery] =
          await Promise.all([
            apiClient.getSponsorshipTiersByUsername({ username }),
            apiClient.getUserPaymentMethods(),
            apiClient.getUserByUsername({ username }),
          ]);

        setData({
          sponsorship: sponsorshipTierQuery.data?.data?.[0],
          paymentMethods: paymentMethodQuery.data?.data,
          creator: creatorQuery.data,
        });
      } catch (error) {
        console.error('Failed to fetch sponsor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, isEmailVerified]);

  const handleCancel = () => {
    close();
    if (onCancel) {
      onCancel();
    }
  };

  const handleSuccess = () => {
    close();
    if (onSubmit) {
      onSubmit();
    }
  };

  // Check email verification before allowing sponsorship
  if (!isEmailVerified) {
    return (
      <>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Email Verification Required</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-8 text-center">
            <div className="mb-4">
              <p className="text-gray-600">
                You need to verify your email address before you can sponsor other explorers.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  close();
                  window.location.href = ROUTER.USER.SETTINGS.PAGE_KEY('security');
                }}
                className="w-full"
              >
                Verify Email Address
              </Button>
              <Button variant="outline" onClick={handleCancel} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Sponsor</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-8 text-center">
            <div>Loading...</div>
          </div>
        </div>
      </>
    );
  }

  if (!data.creator) {
    return (
      <>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Sponsor</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-8 text-center">
            <div>User not found</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DialogHeader className="flex-shrink-0">
        <DialogTitle>Sponsor {data.creator?.username}</DialogTitle>
      </DialogHeader>
      
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 lg:p-6 min-h-full">
          {/* Creator Summary - Responsive layout */}
          <div className="flex-shrink-0 lg:w-48">
            <SponsorCheckoutSummary user={data.creator} />
          </div>
          
          {/* Sponsorship Form */}
          <div className="flex-1 min-w-0">
            <SponsorshipCheckoutForm
              username={username}
              sponsorship={data.sponsorship}
              paymentMethods={data.paymentMethods}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </>
  );
};

// Wrap with Stripe provider
const SponsorCheckoutModalWithStripeProvider: React.FC<SponsorCheckoutModalProps> = (
  props,
) => (
  <StripeProvider>
    <SponsorCheckoutModal {...props} />
  </StripeProvider>
);

export default SponsorCheckoutModalWithStripeProvider;