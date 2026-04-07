'use client';

import { X, CheckCircle2, Calendar, AlertTriangle, Edit, XCircle, Star, Loader2, CreditCard } from 'lucide-react';
import { DatePicker } from '@/app/components/DatePicker';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/app/utils/dateFormat';
import { expeditionApi, sponsorshipApi, paymentMethodApi, type PaymentMethodFull } from '@/app/services/api';
import { useStripe, useElements, CardElement } from '@/app/context/StripeContext';
import { toast } from 'sonner';

interface ExpeditionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  expedition: {
    id: string;
    title: string;
    status: 'active' | 'planned' | 'completed' | 'cancelled';
    startDate: string;
    estimatedEndDate: string;
    daysActive: number;
    journalEntries: number;
    totalDistance?: number;
    totalFunding?: number;
    backers?: number;
    isRouteLocked?: boolean;
  };
  isPro?: boolean;
  onStatusChange?: (newStatus: 'active' | 'completed') => void;
  onComplete?: (actualEndDate: string) => Promise<void>;
  onCancel?: (reason: string) => Promise<void>;
  sourceBlueprint?: {
    id: string;
    title: string;
    author?: { username: string; name?: string; picture?: string; stripeAccountConnected?: boolean };
  };
}

export function ExpeditionManagementModal({
  isOpen,
  onClose,
  expedition,
  isPro = false,
  onStatusChange: _onStatusChange,
  onComplete,
  onCancel,
  sourceBlueprint,
}: ExpeditionManagementModalProps) {
  const router = useRouter();
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [completeError, setCompleteError] = useState('');
  const [actualEndDate, setActualEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review/tip state (for blueprint-derived expeditions)
  const [showReviewStep, setShowReviewStep] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [savedCard, setSavedCard] = useState<PaymentMethodFull | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const stripe = useStripe();
  const elements = useElements();

  // Load saved payment method for tipping
  useEffect(() => {
    if (isOpen && sourceBlueprint) {
      paymentMethodApi.getAll()
        .then((res) => {
          if (res.data?.length > 0) setSavedCard(res.data[0]);
        })
        .catch(() => {});
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset review state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowReviewStep(false);
      setRating(0);
      setHoverRating(0);
      setReviewText('');
      setTipAmount('');
      setReviewError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Date validation logic
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(expedition.startDate);
  startDate.setHours(0, 0, 0, 0);

  const estimatedEndDate = new Date(expedition.estimatedEndDate);
  estimatedEndDate.setHours(0, 0, 0, 0);

  const hasStarted = startDate <= today;
  const isPastEstimatedEnd = today > estimatedEndDate;
  const isPlanned = expedition.status === 'planned';
  const isActive = expedition.status === 'active';
  const isCompleted = expedition.status === 'completed';
  const isCancelled = expedition.status === 'cancelled';

  // Calculate actual duration if completing
  const actualDuration = expedition.daysActive;

  // Determine if expedition can be completed
  const canComplete = (isActive || (isPlanned && hasStarted)) && !isCompleted && !isCancelled;
  const canActivate = isPlanned && hasStarted && !isCompleted && !isCancelled;
  const canCancel = (isPlanned || isActive) && !isCompleted && !isCancelled;

  const handleComplete = async () => {
    setIsSubmitting(true);
    setCompleteError('');

    try {
      if (onComplete) {
        await onComplete(actualEndDate);
      }
      if (sourceBlueprint) {
        setShowReviewStep(true);
      } else {
        onClose();
      }
    } catch (error: any) {
      console.error('Failed to complete expedition:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to complete expedition. Please try again.';
      setCompleteError(message);
    } finally {
      setIsSubmitting(false);
      setConfirmComplete(false);
    }
  };

  const handleSubmitReview = async () => {
    setIsSubmittingReview(true);
    setReviewError('');

    try {
      // Submit review if rating provided
      if (rating > 0 && sourceBlueprint) {
        await expeditionApi.createReview(sourceBlueprint.id, {
          rating,
          text: reviewText.trim() || undefined,
        });
      }

      // Submit tip if amount entered
      const tipValue = parseFloat(tipAmount);
      if (tipAmount && tipValue > 0) {
        if (tipValue < 5 || tipValue > 100) {
          setReviewError('Tip amount must be between $5 and $100');
          setIsSubmittingReview(false);
          return;
        }
        if (!sourceBlueprint?.author?.username || !sourceBlueprint?.author?.stripeAccountConnected) {
          setReviewError('This guide is not set up to receive tips');
          setIsSubmittingReview(false);
          return;
        }
      }
      if (tipValue >= 5 && tipValue <= 100 && sourceBlueprint?.author?.stripeAccountConnected) {
        let pmId: string | undefined;
        let stripePmId: string | undefined;

        if (savedCard) {
          pmId = savedCard.id;
        } else if (stripe && elements) {
          const cardEl = elements.getElement(CardElement);
          if (cardEl) {
            const { paymentMethod, error } = await stripe.createPaymentMethod({
              type: 'card',
              card: cardEl,
            });
            if (error) {
              setReviewError(error.message || 'Card error');
              setIsSubmittingReview(false);
              return;
            }
            stripePmId = paymentMethod.id;
          }
        }

        if (pmId || stripePmId) {
          const result = await sponsorshipApi.checkout({
            sponsorshipType: 'tip',
            creatorId: sourceBlueprint.author.username,
            oneTimePaymentAmount: tipValue,
            paymentMethodId: pmId,
            stripePaymentMethodId: stripePmId,
          });

          if (stripe && result.clientSecret) {
            const { error } = await stripe.confirmCardPayment(result.clientSecret);
            if (error) {
              setReviewError(error.message || 'Payment failed');
              setIsSubmittingReview(false);
              return;
            }
          }
        }
      }

      // Success toast
      const hasReview = rating > 0;
      const hasTip = tipValue >= 5 && tipValue <= 100;
      if (hasReview && hasTip) toast.success('Review submitted and tip sent!');
      else if (hasReview) toast.success('Review submitted!');
      else if (hasTip) toast.success('Tip sent!');

      onClose();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to submit. Please try again.';
      setReviewError(message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellationReason.trim()) {
      setCancelError('A cancellation reason is required');
      return;
    }
    setCancelError('');
    setIsSubmitting(true);

    try {
      if (onCancel) {
        await onCancel(cancellationReason.trim());
      }
      onClose();
    } catch (error: any) {
      console.error('Failed to cancel expedition:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to cancel expedition. Please try again.';
      setCancelError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#202020]/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 border-b-2 border-[#202020] dark:border-[#616161] ${showReviewStep ? 'bg-[#598636]' : 'bg-[#616161]'} text-white flex items-center justify-between`}>
          <h2 className="text-lg font-bold">{showReviewStep ? 'RATE & REVIEW' : 'MANAGE EXPEDITION'}</h2>
          <button
            onClick={onClose}
            className="hover:text-[#ac6d46] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-white/50 disabled:opacity-50 disabled:active:scale-100"
            disabled={isSubmitting}
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showReviewStep && sourceBlueprint ? (
            <>
              {/* Completion success banner */}
              <div className="mb-6">
                <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#598636]">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={16} className="text-[#598636]" />
                    <span className="text-xs font-bold text-[#598636]">EXPEDITION COMPLETED</span>
                  </div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    You completed an expedition based on &ldquo;{sourceBlueprint.title}&rdquo;
                    {sourceBlueprint.author && ` by ${sourceBlueprint.author.name || sourceBlueprint.author.username}`}.
                  </p>
                </div>
              </div>

              {/* Star Rating */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">YOUR RATING</h3>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={`transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-[#ac6d46] text-[#ac6d46]'
                            : 'text-[#b5bcc4] dark:text-[#616161]'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                  REVIEW <span className="text-[#b5bcc4] font-normal">(OPTIONAL)</span>
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience with this blueprint..."
                  rows={3}
                  maxLength={2000}
                  className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] text-xs font-mono resize-none"
                />
                <div className="text-right text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                  {reviewText.length}/2000
                </div>
              </div>

              {/* Tip Section — only if guide has Stripe Connect */}
              {sourceBlueprint.author?.stripeAccountConnected && (
              <div className="mb-6 border-2 border-[#598636] p-4">
                <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                  TIP THE GUIDE <span className="text-[#b5bcc4] font-normal">(OPTIONAL)</span>
                </h3>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                  Show your appreciation with a tip to {sourceBlueprint.author?.name || sourceBlueprint.author?.username || 'the guide'}.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">$</span>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    step={1}
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    placeholder="0"
                    className="w-24 px-3 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] text-sm font-mono"
                  />
                  <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">$5–$100</span>
                </div>

                {tipAmount && parseFloat(tipAmount) >= 5 && (
                  <>
                    {savedCard ? (
                      <div className="p-3 border-2 border-[#616161] mb-3 flex items-center gap-3">
                        <CreditCard size={16} className="text-[#616161]" />
                        <span className="text-xs font-mono text-[#202020] dark:text-[#e5e5e5]">
                          {(savedCard.label || 'Card').replace(` ${savedCard.last4}`, '').toUpperCase()} ending in {savedCard.last4}
                        </span>
                      </div>
                    ) : (
                      <div className="border-2 border-[#202020] dark:border-[#616161] p-3 mb-3">
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
                    )}
                    <p className="text-[10px] text-[#616161] dark:text-[#b5bcc4]">
                      Guide receives 90% after platform fees. Payments processed securely by Stripe.
                    </p>
                  </>
                )}
              </div>
              )}

              {reviewError && (
                <div className="text-xs text-[#994040] mb-4">{reviewError}</div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSubmittingReview}
                  className="flex-1 px-4 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] text-sm font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  SKIP
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || (rating === 0 && !(tipAmount && parseFloat(tipAmount) > 0))}
                  className="flex-1 px-4 py-3 bg-[#598636] text-white text-sm font-bold hover:bg-[#476b2b] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingReview && <Loader2 size={14} className="animate-spin" />}
                  {isSubmittingReview ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
              </div>
            </>
          ) : (
          <>
          {/* Expedition Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">
              EXPEDITION SUMMARY
            </h3>
            <div className="p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#4676ac]">
              <div className="text-lg font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">
                {expedition.title}
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">STATUS:</div>
                  <div className={`font-bold ${
                    expedition.status === 'active' ? 'text-[#ac6d46]' :
                    expedition.status === 'planned' ? 'text-[#4676ac]' :
                    expedition.status === 'cancelled' ? 'text-[#994040]' :
                    'text-[#616161]'
                  }`}>
                    {expedition.status.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">DAYS ACTIVE:</div>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">{expedition.daysActive}</div>
                </div>
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">START DATE:</div>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">{formatDate(expedition.startDate)}</div>
                </div>
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">ESTIMATED END:</div>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">{formatDate(expedition.estimatedEndDate)}</div>
                </div>
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">JOURNAL ENTRIES:</div>
                  <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">{expedition.journalEntries}</div>
                </div>
                {expedition.totalDistance !== undefined && (
                  <div>
                    <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">TOTAL DISTANCE:</div>
                    <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">{expedition.totalDistance.toLocaleString()} km</div>
                  </div>
                )}
                {expedition.totalFunding !== undefined && (
                  <div>
                    <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">FUNDING RAISED:</div>
                    <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                      ${expedition.totalFunding.toLocaleString()}
                    </div>
                  </div>
                )}
                {expedition.backers !== undefined && (
                  <div>
                    <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">SPONSORS:</div>
                    <div className="font-bold text-[#202020] dark:text-[#e5e5e5]">{expedition.backers}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Status */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">
              TIMELINE STATUS
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#4676ac]" />
                <span className="text-[#616161] dark:text-[#b5bcc4]">
                  {hasStarted ? 'Expedition has started' : `Expedition starts on ${formatDate(expedition.startDate)}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#4676ac]" />
                <span className="text-[#616161] dark:text-[#b5bcc4]">
                  {isPastEstimatedEnd
                    ? `Past estimated end date (${formatDate(expedition.estimatedEndDate)})`
                    : `Estimated to end on ${formatDate(expedition.estimatedEndDate)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Status Change Options */}
          <div className="space-y-4">
            {/* Edit Details - Available for non-cancelled */}
            {!isCancelled && (
              <div className="border-2 border-[#ac6d46] p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Edit size={20} className="text-[#ac6d46] mt-0.5" strokeWidth={2} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      EDIT EXPEDITION DETAILS
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                      {expedition.isRouteLocked
                        ? 'Update expedition details, dates, description, and cover image. Route and waypoints are locked from the original blueprint.'
                        : isPro
                          ? isCompleted
                            ? 'Update title, description, and cover image. Dates, waypoints, route, and sponsorship settings are locked for completed expeditions.'
                            : 'Modify expedition details, dates, description, waypoints, and route planning. Changes will be reflected immediately across all journal views.'
                          : 'Update expedition details, dates, description, and cover image using the quick entry form.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(expedition.isRouteLocked || !isPro ? `/expedition-quick-entry/${expedition.id}` : `/expedition-builder/${expedition.id}`)}
                  className="w-full px-4 py-3 bg-[#ac6d46] text-white text-sm font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] flex items-center justify-center gap-2"
                >
                  {expedition.isRouteLocked
                    ? 'EDIT EXPEDITION DETAILS'
                    : isPro
                      ? isCompleted ? 'EDIT TITLE & DESCRIPTION' : 'EDIT DETAILS & WAYPOINTS'
                      : 'EDIT EXPEDITION'}
                </button>
              </div>
            )}

            {/* Activate Planned Expedition — info only, activation is automatic */}
            {canActivate && (
              <div className="border-2 border-[#4676ac] p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-[#4676ac] mt-0.5" strokeWidth={2} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      READY TO ACTIVATE
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      This expedition has reached its start date and is ready to go. Log your first journal entry to activate it and start your journey.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Complete Expedition */}
            {canComplete && !confirmComplete && (
              <div className="border-2 border-[#4676ac] p-4">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 size={20} className="text-[#4676ac] mt-0.5" strokeWidth={2} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      MARK EXPEDITION AS COMPLETE
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                      Mark this expedition as complete when you have finished your journey. This will close sponsorships for new supporters but you can continue adding retrospective journal entries. Your journal and all entries will remain publicly visible.
                    </p>
                    {isPastEstimatedEnd && (
                      <div className="flex items-start gap-2 p-3 bg-[#fff8e1] dark:bg-[#3a3320] border-l-2 border-[#4676ac] mb-3">
                        <AlertTriangle size={14} className="text-[#4676ac] mt-0.5" strokeWidth={2} />
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                          This expedition is past its estimated end date ({formatDate(expedition.estimatedEndDate)}). You may want to mark it as complete.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmComplete(true)}
                  className="w-full px-4 py-3 bg-[#4676ac] text-white text-sm font-bold hover:bg-[#365a87] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac]"
                >
                  COMPLETE EXPEDITION
                </button>
              </div>
            )}

            {/* Confirmation Step */}
            {confirmComplete && canComplete && (
              <div className="border-2 border-[#ac6d46] p-4 bg-[#fff8e1] dark:bg-[#3a3320]">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-3">
                    CONFIRM EXPEDITION COMPLETION
                  </h4>

                  <div className="mb-4">
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      ACTUAL END DATE <span className="text-[#ac6d46]">*REQUIRED</span>
                    </label>
                    <DatePicker
                      value={actualEndDate}
                      onChange={setActualEndDate}
                      max={new Date().toISOString().split('T')[0]}
                      min={expedition.startDate}
                      className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] text-xs"
                    />
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                      When did you complete this expedition? Must be between start date and today.
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-[#202020] border-2 border-[#616161] mb-4">
                    <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      WHAT HAPPENS WHEN YOU COMPLETE:
                    </div>
                    <ul className="space-y-1 text-xs text-[#616161] dark:text-[#b5bcc4]">
                      <li>• Status changes from {expedition.status.toUpperCase()} to COMPLETED</li>
                      <li>• New sponsorships will no longer be accepted</li>
                      <li>• All journal entries and expedition content remain public</li>
                      <li>• You can still add retrospective journal entries after completion</li>
                      <li>• You can create a new expedition after completing this one</li>
                    </ul>
                  </div>

                  {completeError && (
                    <div className="text-xs text-[#994040] mb-4">{completeError}</div>
                  )}

                  <div className="p-3 bg-white dark:bg-[#202020] border-2 border-[#616161] mb-4">
                    <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      FINAL STATISTICS:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[#616161] dark:text-[#b5bcc4]">Duration:</span>{' '}
                        <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{actualDuration} days</span>
                      </div>
                      <div>
                        <span className="text-[#616161] dark:text-[#b5bcc4]">Entries:</span>{' '}
                        <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{expedition.journalEntries}</span>
                      </div>
                      {expedition.totalDistance !== undefined && (
                        <div>
                          <span className="text-[#616161] dark:text-[#b5bcc4]">Distance:</span>{' '}
                          <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{expedition.totalDistance.toLocaleString()} km</span>
                        </div>
                      )}
                      {expedition.backers !== undefined && (
                        <div>
                          <span className="text-[#616161] dark:text-[#b5bcc4]">Sponsors:</span>{' '}
                          <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{expedition.backers}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmComplete(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] text-sm font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] disabled:opacity-50 disabled:active:scale-100"
                  >
                    BACK
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={isSubmitting || !actualEndDate}
                    className="flex-1 px-4 py-3 bg-[#ac6d46] text-white text-sm font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {isSubmitting ? 'COMPLETING...' : 'CONFIRM COMPLETION'}
                  </button>
                </div>
              </div>
            )}

            {/* Cancel Expedition */}
            {canCancel && !confirmCancel && !confirmComplete && (
              <div className="border-2 border-[#994040] p-4">
                <div className="flex items-start gap-3 mb-4">
                  <XCircle size={20} className="text-[#994040] mt-0.5" strokeWidth={2} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      CANCEL EXPEDITION
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                      Permanently cancel this expedition. All entries will be locked — no new entries can be logged and existing entries cannot be edited. Recurring sponsorships will be paused and all sponsors will be notified with the reason you provide.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="w-full px-4 py-3 bg-[#994040] text-white text-sm font-bold hover:bg-[#7a3333] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040]"
                >
                  CANCEL EXPEDITION
                </button>
              </div>
            )}

            {/* Cancel Confirmation Step */}
            {confirmCancel && canCancel && (
              <div className="border-2 border-[#994040] p-4 bg-[#994040]/10 dark:bg-[#994040]/20">
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-[#994040] mb-3">
                    CONFIRM EXPEDITION CANCELLATION
                  </h4>

                  <div className="mb-4">
                    <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
                      CANCELLATION REASON <span className="text-[#994040]">*REQUIRED</span>
                    </label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => {
                        setCancellationReason(e.target.value);
                        if (cancelError) setCancelError('');
                      }}
                      placeholder="Explain why you are cancelling this expedition..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] text-xs font-mono resize-none"
                    />
                    <div className="flex justify-between mt-1">
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        This reason will be shared with all sponsors.
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        {cancellationReason.length}/500
                      </div>
                    </div>
                    {cancelError && (
                      <div className="text-xs text-[#994040] mt-1">{cancelError}</div>
                    )}
                  </div>

                  <div className="p-3 bg-white dark:bg-[#202020] border-2 border-[#994040] mb-4">
                    <div className="text-xs font-bold text-[#994040] mb-2">
                      WHAT HAPPENS WHEN YOU CANCEL:
                    </div>
                    <ul className="space-y-1 text-xs text-[#616161] dark:text-[#b5bcc4]">
                      <li>• All entries will be locked — no new entries or edits allowed</li>
                      <li>• Recurring sponsorships will be paused (they resume if you start a new expedition)</li>
                      <li>• One-time sponsorships are retained as support already given</li>
                      <li>• All sponsors will be notified with your cancellation reason</li>
                      <li>• Expedition will be hidden from public listings</li>
                      <li>• Expedition remains accessible via direct link with a cancelled banner</li>
                      <li>• This action cannot be undone</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setConfirmCancel(false);
                      setCancellationReason('');
                      setCancelError('');
                    }}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] text-sm font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] disabled:opacity-50 disabled:active:scale-100"
                  >
                    BACK
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting || !cancellationReason.trim()}
                    className="flex-1 px-4 py-3 bg-[#994040] text-white text-sm font-bold hover:bg-[#7a3333] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#994040] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                  >
                    {isSubmitting ? 'CANCELLING...' : 'CONFIRM CANCELLATION'}
                  </button>
                </div>
              </div>
            )}

            {/* Cannot Complete Messages */}
            {!hasStarted && isPlanned && (
              <div className="border-2 border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-[#616161] mt-0.5" strokeWidth={2} />
                  <div>
                    <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      EXPEDITION NOT STARTED
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      This expedition has not reached its start date yet ({formatDate(expedition.startDate)}). You cannot complete an expedition that has not started. It will activate automatically on its start date, or when you log a journal entry.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="border-2 border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-[#616161] mt-0.5" strokeWidth={2} />
                  <div>
                    <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      EXPEDITION ALREADY COMPLETED
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      This expedition has already been marked as complete. Sponsorships are closed, but you can still add retrospective journal entries. Your journal remains publicly visible.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isCancelled && (
              <div className="border-2 border-[#994040] p-4 bg-[#994040]/10 dark:bg-[#994040]/20">
                <div className="flex items-start gap-3">
                  <XCircle size={20} className="text-[#994040] mt-0.5" strokeWidth={2} />
                  <div>
                    <h4 className="text-sm font-bold text-[#994040] mb-2">
                      EXPEDITION CANCELLED
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      This expedition has been cancelled. All entries are locked — no new entries can be logged and existing entries cannot be edited. Recurring sponsorships have been paused and all sponsors have been notified. The expedition is hidden from public listings but remains accessible via direct link.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
