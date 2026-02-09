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
    sponsorships?: any[];
    paymentMethods?: { id: string; label: string }[];
    creator?: any;
    userSponsorships?: any[];
    existingSponsorship?: any;
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
        
        const [sponsorshipTierQuery, paymentMethodQuery, creatorQuery, userSponsorshipsQuery] =
          await Promise.all([
            apiClient.getSponsorshipTiersByUsername({ username }),
            apiClient.getUserPaymentMethods(),
            apiClient.getUserByUsername({ username }),
            apiClient.getUserSponsorships(),
          ]);

        // Check if user already sponsors this creator
        const userSponsorships = userSponsorshipsQuery.data?.data || [];
        const existingSponsorship = userSponsorships.find(
          (sponsorship: any) => 
            sponsorship.creator?.username === username && 
            sponsorship.type === 'subscription' &&
            (sponsorship.status === 'active' || sponsorship.status === 'pending')
        );

        setData({
          sponsorships: sponsorshipTierQuery.data?.data || [],
          paymentMethods: paymentMethodQuery.data?.data,
          creator: creatorQuery.data,
          userSponsorships,
          existingSponsorship,
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
                You need to verify your email address before you can sponsor an explorer.
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
      
      <div className="flex-1 min-h-0 overflow-y-auto max-h-[80vh]">
        <div className="w-full flex flex-col gap-6 p-4 lg:p-6 max-w-4xl mx-auto">
          {/* Explorer Summary - Top layout */}
          <div className="flex-shrink-0">
            <SponsorCheckoutSummary user={data.creator} />
          </div>
          
          {/* Existing Sponsorship Notice */}
          {data.existingSponsorship && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    You're already sponsoring {data.creator?.username}
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    You can still make one-time payments, but subscription options are disabled since you already have an active recurring sponsorship.
                  </p>
                  <p className="text-sm text-blue-700">
                    To change to a different recurring sponsorship tier, please{' '}
                    <button
                      onClick={() => {
                        handleCancel();
                        window.location.href = '/user/settings/sponsorships';
                      }}
                      className="underline hover:text-blue-800 font-medium"
                    >
                      visit your sponsorship settings
                    </button>
                    {' '}to cancel your current sponsorship first, then return here to set up a new one.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Sponsorship Form - Full width */}
          <div className="flex-1 min-w-0">
            <SponsorshipCheckoutForm
              username={username}
              sponsorships={data.sponsorships}
              paymentMethods={data.paymentMethods}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
              existingSponsorship={data.existingSponsorship}
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