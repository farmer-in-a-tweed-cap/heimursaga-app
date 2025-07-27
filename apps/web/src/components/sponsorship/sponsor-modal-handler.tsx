'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { MODALS } from '@/components';
import { useModal } from '@/hooks';

/**
 * Component that detects URL parameters and opens sponsor modal
 * Usage: Add ?sponsor=username to any URL to open sponsor modal
 */
export const SponsorModalHandler = () => {
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const modal = useModal();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const sponsorUsername = searchParams.get('sponsor');
    
    if (sponsorUsername) {
      modal.open(MODALS.SPONSOR_CHECKOUT, {
        props: { username: sponsorUsername },
        full: true,
      });
    }
  }, [searchParams, modal, mounted]);

  return null; // This component doesn't render anything
};