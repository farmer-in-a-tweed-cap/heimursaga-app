'use client';

import { Button } from '@repo/ui/components';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ROUTER } from '@/router';

const CONSENT_KEY = 'heimursaga-cookie-consent';

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user has already given consent
    const hasConsented = localStorage.getItem(CONSENT_KEY);
    if (!hasConsented) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setShowBanner(false);
  };

  // Don't render on server or if user already consented
  if (!mounted || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:max-w-md">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Cookie Notice
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              We use essential cookies to provide our services and analytics cookies to understand how you use our site. 
              By continuing, you agree to our use of cookies.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleAccept}
              size="sm"
              className="text-xs"
            >
              Accept All
            </Button>
            <Link 
              href={ROUTER.LEGAL.PRIVACY}
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 self-center"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};