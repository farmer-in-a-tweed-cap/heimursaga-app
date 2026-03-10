'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { sponsorshipApi, paymentMethodApi, type PaymentMethodFull } from '@/app/services/api';
import { ConfirmationModal } from './ConfirmationModal';
import { QuickSponsorCardModal } from './QuickSponsorCardModal';
import { toast } from 'sonner';

interface QuickSponsorButtonProps {
  entryPublicId: string;
  authorUsername: string;
  isProAuthor: boolean;
  stripeConnected: boolean;
  expeditionId?: string;
  expeditionTitle?: string;
}

export function QuickSponsorButton({
  entryPublicId,
  authorUsername,
  isProAuthor,
  stripeConnected,
  expeditionId,
  expeditionTitle,
}: QuickSponsorButtonProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [savedCard, setSavedCard] = useState<PaymentMethodFull | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      paymentMethodApi.getAll()
        .then((res) => {
          if (res.data?.length > 0) {
            setSavedCard(res.data[0]);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  if (!isProAuthor || !stripeConnected) return null;

  const handleClick = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const result = await sponsorshipApi.quickSponsor(entryPublicId);

      if (result.requiresPaymentMethod && result.clientSecret) {
        setClientSecret(result.clientSecret);
        setShowConfirmModal(false);
        setShowCardModal(true);
      } else if (result.success) {
        handleSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process sponsorship');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardSuccess = () => {
    setShowCardModal(false);
    handleSuccess();
  };

  const handleSuccess = () => {
    setShowConfirmModal(false);
    setCooldown(true);
    toast.success('Sponsorship sent!');
    setTimeout(() => setCooldown(false), 30000);
  };

  const label = 'QUICK SPONSOR $3';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={cooldown || isLoading}
        className={`px-6 py-3 text-sm font-bold transition-all active:scale-[0.98] whitespace-nowrap flex items-center justify-center ${
          cooldown
            ? 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#616161] dark:text-[#b5bcc4] cursor-not-allowed'
              : 'bg-[#4676ac] text-white hover:bg-[#365d8a]'
        } disabled:opacity-50`}
      >
        {isLoading && <Loader2 size={14} className="animate-spin mr-2" />}
        {label}
      </button>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirm}
        title="Quick sponsor this explorer"
        headerColor="bg-[#ac6d46]"
        confirmLabel="CONFIRM — $3.00"
        confirmColor="bg-[#ac6d46] text-white hover:bg-[#8a5738]"
        isLoading={isLoading}
      >
        <div className="space-y-4 mb-4">
          <p className="text-sm text-[#202020] dark:text-[#e5e5e5]">
            You&apos;re about to sponsor <strong>{authorUsername}</strong> $3.00 as a show of appreciation for this journal entry.
          </p>
          {expeditionId && expeditionTitle && (
            <p className="text-xs text-[#4676ac] dark:text-[#7ba3d4]">
              This sponsorship will count toward <strong>{expeditionTitle}</strong> expedition funding.
            </p>
          )}
          <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
            Explorer receives $2.70 after platform and Stripe fees.
          </p>

          {savedCard && (
            <div className="border border-[#b5bcc4] dark:border-[#616161] p-3 flex items-center justify-between">
              <div className="text-xs font-mono text-[#202020] dark:text-[#e5e5e5]">
                <span className="uppercase">{(savedCard.label || 'Card').replace(` ${savedCard.last4}`, '')}</span> ending in {savedCard.last4}
              </div>
            </div>
          )}

          {!savedCard && isAuthenticated && (
            <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
              You&apos;ll be prompted to add a payment method.
            </p>
          )}

          <p className="text-[10px] text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
            Payments are processed securely by Stripe. Heimursaga never stores or has access to your full card details.
          </p>
        </div>
      </ConfirmationModal>

      {showCardModal && clientSecret && (
        <QuickSponsorCardModal
          clientSecret={clientSecret}
          entryPublicId={entryPublicId}
          onSuccess={handleCardSuccess}
          onClose={() => setShowCardModal(false)}
        />
      )}
    </>
  );
}
