'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useEffect, useState } from 'react';
import { expeditionApi, explorerApi, type Expedition, type ExplorerProfile } from '@/app/services/api';
import { Loader2 } from 'lucide-react';

export function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const expeditionId = searchParams.get('expedition') || '';
  const amount = parseFloat(searchParams.get('amount') || '0');
  const paymentType = searchParams.get('type') || 'one-time';
  const explorerUsername = searchParams.get('explorer') || '';
  const paymentIntentId = searchParams.get('paymentIntent') || '';

  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [explorer, setExplorer] = useState<ExplorerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const timestamp = new Date();

  // Generate a Heimursaga transaction reference (based on payment intent if available)
  const transactionId = paymentIntentId
    ? `HS-${paymentIntentId.replace('pi_', '').substring(0, 12).toUpperCase()}`
    : `HS-${Date.now().toString(36).toUpperCase()}`;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch expedition data
        if (expeditionId) {
          const expeditionData = await expeditionApi.getById(expeditionId);
          setExpedition(expeditionData);

          // Use explorer username from URL or expedition
          const username = explorerUsername || expeditionData.author?.username || expeditionData.explorer?.username;
          if (username) {
            const explorerData = await explorerApi.getByUsername(username);
            setExplorer(explorerData);
          }
        } else if (explorerUsername) {
          // If no expedition ID but we have explorer username
          const explorerData = await explorerApi.getByUsername(explorerUsername);
          setExplorer(explorerData);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [expeditionId, explorerUsername]);

  // Calculate fees
  const stripeFeePercent = 0.029;
  const stripeFeeFixed = 0.30;
  const platformFee = amount * 0.05;
  const stripeFee = (amount * stripeFeePercent) + stripeFeeFixed;
  const explorerReceives = amount - platformFee - stripeFee;

  // Display name - use username
  const displayExplorerName = explorer?.username || explorerUsername || 'the explorer';
  const displayExpeditionTitle = expedition?.title || 'Expedition';

  if (isLoading) {
    return (
      <div className="py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#b5bcc4]" />
          <p className="mt-4 text-[#b5bcc4]">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Message */}
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
          <div className="bg-[#ac6d46] text-white p-8 border-b-2 border-[#202020] dark:border-[#616161] text-center">
            <div className="text-6xl mb-4">✓</div>
            <h1 className="text-3xl font-bold mb-2">PAYMENT SUCCESSFUL</h1>
            <p className="text-lg text-[#f5f5f5]">
              Thank you for supporting {displayExplorerName}'s exploration work!
            </p>
          </div>

          <div className="p-8">
            {/* Transaction Summary */}
            <div className="bg-[#f0f4f8] dark:bg-[#2a2a2a] border-2 border-[#4676ac] p-6 mb-6">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-[#ac6d46] mb-2">
                  ${amount.toFixed(2)}
                  {paymentType === 'recurring' && <span className="text-2xl">/month</span>}
                </div>
                <div className="text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
                  {paymentType === 'one-time' ? 'ONE-TIME SPONSORSHIP' : 'MONTHLY SUBSCRIPTION ACTIVATED'}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <div className="font-bold mb-3 dark:text-[#e5e5e5]">SPONSORSHIP DETAILS:</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#616161] dark:text-[#b5bcc4]">Explorer:</span>
                      <span className="font-bold dark:text-[#e5e5e5]">{displayExplorerName}</span>
                    </div>
                    {expedition && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#616161] dark:text-[#b5bcc4]">Current Expedition:</span>
                          <span className="font-bold dark:text-[#e5e5e5]">{displayExpeditionTitle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#616161] dark:text-[#b5bcc4]">Expedition ID:</span>
                          <span className="font-bold dark:text-[#e5e5e5]">{expeditionId}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-bold mb-3 dark:text-[#e5e5e5]">PAYMENT DETAILS:</div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#616161] dark:text-[#b5bcc4]">Date & Time:</span>
                      <span className="font-bold dark:text-[#e5e5e5]">{timestamp.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#616161] dark:text-[#b5bcc4]">Payment Method:</span>
                      <span className="font-bold dark:text-[#e5e5e5]">Card via Stripe</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#616161] dark:text-[#b5bcc4]">Status:</span>
                      <span className="font-bold text-[#ac6d46]">COMPLETED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="bg-white dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
              <div className="font-bold mb-4 dark:text-[#e5e5e5]">FINANCIAL BREAKDOWN:</div>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Your contribution:</span>
                  <span className="font-bold dark:text-[#e5e5e5]">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Platform fee (5%):</span>
                  <span className="text-[#ac6d46]">-${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#616161] dark:text-[#b5bcc4]">Stripe processing fee:</span>
                  <span className="text-[#ac6d46]">-${stripeFee.toFixed(2)}</span>
                </div>
                <div className="pt-2 mt-2 border-t-2 border-[#202020] dark:border-[#616161] flex justify-between font-bold text-base">
                  <span className="dark:text-[#e5e5e5]">Explorer receives:</span>
                  <span className="text-[#ac6d46]">${explorerReceives.toFixed(2)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#b5bcc4] dark:border-[#616161] text-xs text-[#616161] dark:text-[#b5bcc4]">
                Funds are typically transferred to the explorer's account within 2-7 business days, depending on their bank and location.
              </div>
            </div>

            {/* Transaction IDs */}
            <div className="bg-white dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
              <div className="font-bold mb-4 dark:text-[#e5e5e5]">TRANSACTION RECORDS:</div>
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Heimursaga Reference:</div>
                  <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] p-2 border border-[#b5bcc4] dark:border-[#616161] break-all dark:text-[#e5e5e5]">{transactionId}</div>
                </div>
                {paymentIntentId && (
                  <div>
                    <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Stripe Payment ID:</div>
                    <div className="bg-[#f5f5f5] dark:bg-[#1a1a1a] p-2 border border-[#b5bcc4] dark:border-[#616161] break-all dark:text-[#e5e5e5]">{paymentIntentId}</div>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-[#b5bcc4] dark:border-[#616161] text-xs text-[#616161] dark:text-[#b5bcc4]">
                Save these transaction IDs for your records. A confirmation email has been sent to {user?.email || 'your email'}.
              </div>
            </div>

            {/* Subscription Details */}
            {paymentType === 'recurring' && (
              <div className="bg-[#fff8e5] dark:bg-[#2a2a1a] border-2 border-[#ac6d46] p-6 mb-6">
                <div className="font-bold mb-3 flex items-center gap-2 dark:text-[#e5e5e5]">
                  SUBSCRIPTION ACTIVE
                </div>
                <div className="text-sm space-y-2 dark:text-[#e5e5e5]">
                  <p>Your monthly subscription has been activated. You will be charged <strong>${amount.toFixed(2)}</strong> on the same day each month.</p>
                  <div className="pt-3 border-t border-[#ac6d46] space-y-1 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-[#616161] dark:text-[#b5bcc4]">First charge:</span>
                      <span className="font-bold">Today ({timestamp.toLocaleDateString()})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#616161] dark:text-[#b5bcc4]">Next charge:</span>
                      <span className="font-bold">{new Date(timestamp.getTime() + 30*24*60*60*1000).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#616161] dark:text-[#b5bcc4]">Billing cycle:</span>
                      <span className="font-bold">Monthly (same day each month)</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#ac6d46] text-xs">
                    <strong>Manage subscription:</strong> You can cancel, pause, or modify your subscription anytime from your account dashboard. Cancellations take effect at the end of the current billing period.
                  </div>
                </div>
              </div>
            )}

            {/* What Happens Next */}
            <div className="bg-white dark:bg-[#2a2a2a] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
              <div className="font-bold mb-4 dark:text-[#e5e5e5]">WHAT HAPPENS NEXT:</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#ac6d46] text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <div className="font-bold mb-1 dark:text-[#e5e5e5]">Confirmation Email Sent</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      You'll receive a detailed receipt and confirmation email at {user?.email || 'your email'} within the next few minutes.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#ac6d46] text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <div className="font-bold mb-1 dark:text-[#e5e5e5]">Explorer Notification</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      {displayExplorerName} will be notified of your sponsorship and may send a personal thank you message.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#ac6d46] text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <div className="font-bold mb-1 dark:text-[#e5e5e5]">Public Recognition</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Your name will appear in the sponsors list on the expedition page (if you opted in for public display).
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#ac6d46] text-white rounded-full flex items-center justify-center font-bold">4</div>
                  <div>
                    <div className="font-bold mb-1 dark:text-[#e5e5e5]">Stay Updated</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      You'll receive notifications when {displayExplorerName} posts new journal entries (if you opted in for updates).
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#ac6d46] text-white rounded-full flex items-center justify-center font-bold">5</div>
                  <div>
                    <div className="font-bold mb-1 dark:text-[#e5e5e5]">Funds Transfer</div>
                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                      Your contribution (minus fees) will be transferred to {displayExplorerName}'s account within 2-7 business days.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid md:grid-cols-3 gap-4">
              {expeditionId && (
                <Link
                  href={`/expedition/${expeditionId}`}
                  className="px-6 py-4 bg-[#ac6d46] text-white text-center hover:bg-[#8a5738] transition-all"
                >
                  VIEW EXPEDITION
                </Link>
              )}
              <Link
                href="/sponsorship"
                className="px-6 py-4 bg-[#4676ac] text-white text-center hover:bg-[#365a87] transition-all"
              >
                MY DASHBOARD
              </Link>
              <Link
                href="/expeditions"
                className="px-6 py-4 border-2 border-[#202020] dark:border-[#616161] text-center hover:bg-[#95a2aa] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5]"
              >
                BROWSE MORE
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Info Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Support & Help */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <div className="font-bold mb-3 dark:text-[#e5e5e5]">SUPPORT & HELP:</div>
            <div className="text-sm space-y-2 text-[#616161] dark:text-[#b5bcc4]">
              <p>Questions about your sponsorship? Need to update your payment method?</p>
              <div className="pt-3 border-t border-[#b5bcc4] dark:border-[#616161] space-y-2">
                <Link href="/help" className="block text-[#4676ac] hover:underline text-xs">
                  → Visit Help Center
                </Link>
                <Link href="/contact" className="block text-[#4676ac] hover:underline text-xs">
                  → Contact Support
                </Link>
                <Link href="/sponsorship" className="block text-[#4676ac] hover:underline text-xs">
                  → Manage Sponsorships
                </Link>
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <div className="font-bold mb-3 dark:text-[#e5e5e5]">TAX INFORMATION:</div>
            <div className="text-sm space-y-2 text-[#616161] dark:text-[#b5bcc4]">
              <p>Sponsorships on Heimursaga are generally <strong>not tax-deductible</strong> as they are personal contributions, not charitable donations.</p>
              <p className="text-xs pt-2 border-t border-[#b5bcc4] dark:border-[#616161]">
                Consult with a tax professional for specific advice. Transaction records are available in your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* System Metadata */}
        <div className="mt-6 bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 text-xs font-mono">
          <div className="font-bold mb-2 dark:text-[#e5e5e5]">SYSTEM METADATA:</div>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-[#616161] dark:text-[#b5bcc4]">
            <div><span className="text-[#202020] dark:text-[#e5e5e5]">Reference:</span> {transactionId}</div>
            {paymentIntentId && <div><span className="text-[#202020] dark:text-[#e5e5e5]">Stripe Payment ID:</span> {paymentIntentId}</div>}
            <div><span className="text-[#202020] dark:text-[#e5e5e5]">Timestamp:</span> {timestamp.toISOString()}</div>
            <div><span className="text-[#202020] dark:text-[#e5e5e5]">Status:</span> <span className="text-[#ac6d46] font-bold">SUCCESS</span></div>
            <div><span className="text-[#202020] dark:text-[#e5e5e5]">Payment Method:</span> Stripe (Card)</div>
            <div><span className="text-[#202020] dark:text-[#e5e5e5]">Currency:</span> USD</div>
          </div>
        </div>
      </div>
    </div>
  );
}
