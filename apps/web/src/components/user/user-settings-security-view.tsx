'use client';

import {
  Button,
  Card,
  CardContent,
} from '@repo/ui/components';
import { useToast } from '@repo/ui/hooks';
import React, { useState } from 'react';

import { apiClient } from '@/lib/api';

type Props = {
  email: string;
  isEmailVerified?: boolean;
};

export const UserSettingsSecurityView: React.FC<Props> = ({
  email,
  isEmailVerified = false,
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
    <Card className="flex flex-col gap-6">
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Verification</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Address</p>
                  <p className="text-sm text-gray-600">{email}</p>
                  <div className="mt-2">
                    {isEmailVerified ? (
                      <div className="flex items-center text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-green-700 font-medium">Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-sm">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-yellow-700 font-medium">Not verified</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {!isEmailVerified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    loading={loading}
                  >
                    Send Verification Email
                  </Button>
                )}
              </div>
              
              {!isEmailVerified && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Email verification required:</strong> You need to verify your email address to receive notifications and sponsored post emails. Check your inbox for a verification email or click the button above to resend it.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};