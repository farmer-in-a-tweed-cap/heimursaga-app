'use client';

import {
  Button,
  Card,
  CardContent,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import { Envelope, X } from '@repo/ui/icons';
import React, { useState } from 'react';

import { apiClient } from '@/lib/api';

type Props = {
  email: string;
  dismissible?: boolean;
  onDismiss?: () => void;
};

export const EmailVerificationBanner: React.FC<Props> = ({
  email,
  dismissible = false,
  onDismiss,
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleResendVerification = async () => {
    try {
      setLoading(true);
      
      const response = await apiClient.resendEmailVerification();
      const { success, message } = response?.data || { success: false, message: 'Failed to send verification email' };
      
      if (success) {
        toast({ type: 'success', message: 'Verification email sent to your inbox' });
      } else {
        toast({ type: 'error', message: message || 'Failed to send verification email' });
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to send verification email';
      toast({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <Envelope className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800 mb-1">
                Verify your email address
              </h4>
              <p className="text-sm text-amber-700 mb-3">
                Please check your inbox and verify your email address ({email}) to secure your account and unlock all features.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendVerification}
                loading={loading}
                className="bg-white border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                Resend verification email
              </Button>
            </div>
          </div>
          
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-amber-600 hover:text-amber-800 p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};