'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { CreditCard, RefreshCw, DollarSign, TrendingUp, Users, Search, ChevronDown, ChevronUp, ExternalLink, Pause, Play, X, Loader2 } from 'lucide-react';
import { sponsorshipApi, payoutApi, type SponsorshipFull, type PayoutBalance } from '@/app/services/api';
import { toast } from 'sonner';

type TabType = 'overview' | 'active' | 'history' | 'received';

export function SponsorshipDashboardPage() {
  const { isAuthenticated } = useAuth();
  const { isPro } = useProFeatures();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  // Data state
  const [mySponsorships, setMySponsorships] = useState<SponsorshipFull[]>([]);
  const [receivedSponsorships, setReceivedSponsorships] = useState<SponsorshipFull[]>([]);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [togglingEmailId, setTogglingEmailId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sponsorshipsRes] = await Promise.all([
        sponsorshipApi.getMySponsorships().catch(() => ({ results: 0, data: [] })),
      ]);

      setMySponsorships(sponsorshipsRes.data || []);

      // If user is pro, also fetch received sponsorships and balance
      if (isPro) {
        const [receivedRes, balanceRes] = await Promise.all([
          sponsorshipApi.getReceivedSponsorships().catch(() => ({ results: 0, data: [] })),
          payoutApi.getBalance().catch(() => ({
            available: { amount: 0, currency: 'USD', symbol: '$' },
            pending: { amount: 0, currency: 'USD', symbol: '$' },
          })),
        ]);
        setReceivedSponsorships(receivedRes.data || []);
        setBalance(balanceRes);
      }
    } catch {
      toast.error('Failed to load sponsorship data');
    } finally {
      setIsLoading(false);
    }
  }, [isPro]);

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, fetchData]);

  const handleCancelSponsorship = async (sponsorshipId: string) => {
    if (!confirm('Are you sure you want to cancel this sponsorship? This action cannot be undone.')) {
      return;
    }

    setCancelingId(sponsorshipId);
    try {
      await sponsorshipApi.cancelSponsorship(sponsorshipId);
      toast.success('Sponsorship canceled successfully');
      fetchData();
    } catch {
      toast.error('Failed to cancel sponsorship');
    } finally {
      setCancelingId(null);
    }
  };

  const handleToggleEmailDelivery = async (sponsorshipId: string, currentEnabled: boolean) => {
    setTogglingEmailId(sponsorshipId);
    try {
      await sponsorshipApi.toggleEmailDelivery(sponsorshipId, !currentEnabled);
      toast.success(`Email updates ${!currentEnabled ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch {
      toast.error('Failed to update email settings');
    } finally {
      setTogglingEmailId(null);
    }
  };

  // Separate active subscriptions from one-time
  const activeSubscriptions = mySponsorships.filter(
    (s) => s.type === 'SUBSCRIPTION' && s.status === 'ACTIVE'
  );
  const allPaymentHistory = mySponsorships; // All sponsorships serve as payment history

  // Calculate totals
  const totalActiveSubscriptions = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const totalSponsored = mySponsorships.reduce((sum, sp) => sum + sp.amount, 0);
  const totalExpeditionsSupported = new Set(
    mySponsorships.map((s) => s.sponsoredExplorer?.username).filter(Boolean)
  ).size;

  // Filter by search
  const filteredHistory = searchQuery
    ? allPaymentHistory.filter(
        (p) =>
          p.sponsoredExplorer?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sponsoredExplorer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allPaymentHistory;

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8">
          <h1 className="text-2xl font-bold mb-4 dark:text-[#e5e5e5]">Authentication Required</h1>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
            You must be logged in to view your sponsorship dashboard.
          </p>
          <Link
            href="/auth"
            className="inline-block px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#202020] transition-all"
          >
            LOG IN / SIGN UP
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#616161]" />
        <p className="mt-4 text-[#616161] dark:text-[#b5bcc4]">Loading your sponsorships...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-12">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 dark:text-[#e5e5e5]">SPONSORSHIP DASHBOARD</h1>
        <p className="text-[#616161] dark:text-[#b5bcc4]">
          Manage your sponsorships, subscriptions, and payment history
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="flex flex-wrap border-b-2 border-[#202020] dark:border-[#616161]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-bold text-sm border-r-2 border-[#202020] dark:border-[#616161] transition-all ${
              activeTab === 'overview'
                ? 'bg-[#4676ac] text-white'
                : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] dark:text-[#e5e5e5]'
            }`}
          >
            OVERVIEW
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-6 py-3 font-bold text-sm border-r-2 border-[#202020] dark:border-[#616161] transition-all ${
              activeTab === 'active'
                ? 'bg-[#4676ac] text-white'
                : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] dark:text-[#e5e5e5]'
            }`}
          >
            ACTIVE SUBSCRIPTIONS ({activeSubscriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-bold text-sm border-r-2 border-[#202020] dark:border-[#616161] transition-all ${
              activeTab === 'history'
                ? 'bg-[#4676ac] text-white'
                : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] dark:text-[#e5e5e5]'
            }`}
          >
            PAYMENT HISTORY ({allPaymentHistory.length})
          </button>
          {isPro && (
            <button
              onClick={() => setActiveTab('received')}
              className={`px-6 py-3 font-bold text-sm transition-all ${
                activeTab === 'received'
                  ? 'bg-[#4676ac] text-white'
                  : 'hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] dark:text-[#e5e5e5]'
              }`}
            >
              RECEIVED SPONSORSHIPS ({receivedSponsorships.length})
            </button>
          )}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#ac6d46] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                <h3 className="text-xs font-bold">TOTAL SPONSORED</h3>
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold mb-2 dark:text-[#e5e5e5]">${totalSponsored.toFixed(2)}</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">All-time contributions</div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#4676ac] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                <h3 className="text-xs font-bold">ACTIVE SUBSCRIPTIONS</h3>
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold mb-2 dark:text-[#e5e5e5]">{activeSubscriptions.length}</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                  ${totalActiveSubscriptions.toFixed(2)}/month recurring
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                <h3 className="text-xs font-bold">EXPLORERS SUPPORTED</h3>
                <Users className="w-5 h-5" />
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold mb-2 dark:text-[#e5e5e5]">{totalExpeditionsSupported}</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">Unique explorers</div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
                <h3 className="text-xs font-bold">TRANSACTIONS</h3>
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="p-6">
                <div className="text-3xl font-bold mb-2 dark:text-[#e5e5e5]">{allPaymentHistory.length}</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">Total payments</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <h3 className="font-bold mb-4 dark:text-[#e5e5e5]">QUICK ACTIONS:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/expeditions"
                className="p-4 border-2 border-[#ac6d46] hover:bg-[#ac6d46] hover:text-white transition-all text-center font-bold dark:text-[#e5e5e5]"
              >
                FIND NEW EXPEDITIONS
              </Link>
              <button
                onClick={() => setActiveTab('active')}
                className="p-4 border-2 border-[#4676ac] hover:bg-[#4676ac] hover:text-white transition-all font-bold dark:text-[#e5e5e5]"
              >
                MANAGE SUBSCRIPTIONS
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="p-4 border-2 border-[#202020] dark:border-[#616161] hover:bg-[#b5bcc4] dark:hover:bg-[#2a2a2a] transition-all font-bold dark:text-[#e5e5e5]"
              >
                VIEW PAYMENT HISTORY
              </button>
            </div>
          </div>

          {/* Empty state */}
          {mySponsorships.length === 0 && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
              <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">No Sponsorships Yet</h3>
              <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
                You haven't sponsored any explorers yet. Browse expeditions to find explorers to support.
              </p>
              <Link
                href="/expeditions"
                className="inline-block px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all"
              >
                BROWSE EXPEDITIONS
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Active Subscriptions Tab */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {activeSubscriptions.length === 0 ? (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
              <RefreshCw className="w-16 h-16 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
              <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">No Active Subscriptions</h3>
              <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
                You don't have any active recurring sponsorships yet.
              </p>
              <Link
                href="/expeditions"
                className="inline-block px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#202020] transition-all"
              >
                BROWSE EXPEDITIONS
              </Link>
            </div>
          ) : (
            activeSubscriptions.map((sub) => (
              <div key={sub.id} className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-6 border-b-2 border-[#202020] dark:border-[#616161]">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="px-2 py-1 bg-[#4676ac] text-white text-xs font-bold">
                          {sub.status}
                        </div>
                        <div className="px-2 py-1 bg-[#616161] text-white text-xs font-mono">
                          ID: {sub.id.substring(0, 8)}...
                        </div>
                      </div>
                      <Link
                        href={`/journal/${sub.sponsoredExplorer?.username}`}
                        className="text-2xl font-bold hover:text-[#ac6d46] transition-all inline-flex items-center gap-2 dark:text-[#e5e5e5]"
                      >
                        {sub.sponsoredExplorer?.name || sub.sponsoredExplorer?.username || 'Unknown Explorer'}
                        <ExternalLink className="w-5 h-5" />
                      </Link>
                      <div className="text-sm text-[#616161] dark:text-[#b5bcc4] mt-1">
                        @{sub.sponsoredExplorer?.username}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold text-[#ac6d46] mb-1">
                        ${(sub.amount).toFixed(2)}<span className="text-xl">/mo</span>
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">Monthly subscription</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-bold text-sm mb-3 dark:text-[#e5e5e5]">SUBSCRIPTION DETAILS:</h4>
                      <div className="space-y-2 text-sm font-mono">
                        <div className="flex justify-between">
                          <span className="text-[#616161] dark:text-[#b5bcc4]">Start date:</span>
                          <span className="font-bold dark:text-[#e5e5e5]">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#616161] dark:text-[#b5bcc4]">Next billing:</span>
                          <span className="font-bold text-[#4676ac]">
                            {sub.expiry ? new Date(sub.expiry).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#616161] dark:text-[#b5bcc4]">Email updates:</span>
                          <span className="font-bold dark:text-[#e5e5e5]">
                            {sub.emailDeliveryEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#616161] dark:text-[#b5bcc4]">Status:</span>
                          <span className="font-bold text-[#4676ac] uppercase">{sub.status}</span>
                        </div>
                      </div>
                    </div>

                    {sub.message && (
                      <div>
                        <h4 className="font-bold text-sm mb-3 dark:text-[#e5e5e5]">YOUR MESSAGE:</h4>
                        <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] text-sm italic dark:text-[#b5bcc4]">
                          "{sub.message}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t-2 border-[#202020] dark:border-[#616161]">
                    <Link
                      href={`/journal/${sub.sponsoredExplorer?.username}`}
                      className="px-4 py-2 bg-[#4676ac] text-white hover:bg-[#202020] transition-all text-sm font-bold flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      VIEW JOURNAL
                    </Link>
                    <button
                      onClick={() => handleToggleEmailDelivery(sub.id, sub.emailDeliveryEnabled)}
                      disabled={togglingEmailId === sub.id}
                      className="px-4 py-2 border-2 border-[#616161] hover:bg-[#616161] hover:text-white transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-50 dark:text-[#e5e5e5]"
                    >
                      {togglingEmailId === sub.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : sub.emailDeliveryEnabled ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      {sub.emailDeliveryEnabled ? 'DISABLE EMAILS' : 'ENABLE EMAILS'}
                    </button>
                    <button
                      onClick={() => handleCancelSponsorship(sub.id)}
                      disabled={cancelingId === sub.id}
                      className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] hover:bg-[#202020] dark:hover:bg-[#616161] hover:text-white transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-50 dark:text-[#e5e5e5]"
                    >
                      {cancelingId === sub.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      CANCEL SUBSCRIPTION
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-[#fff8e5] dark:bg-[#2a2a20] border-l-4 border-[#ac6d46] text-xs dark:text-[#b5bcc4]">
                    <strong>Note:</strong> Canceling will end your subscription at the end of the current billing period. No refunds for partial months.
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Payment History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#616161]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by explorer or transaction ID..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none bg-white dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                />
              </div>
            </div>
          </div>

          {/* Payment History Table */}
          {filteredHistory.length === 0 ? (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
              <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">No Payment History</h3>
              <p className="text-[#616161] dark:text-[#b5bcc4]">
                {searchQuery ? 'No payments match your search.' : 'You have no payment history yet.'}
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                <h3 className="text-sm font-bold">PAYMENT HISTORY ({filteredHistory.length} transactions)</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                      <th className="text-left p-4 text-xs font-bold dark:text-[#e5e5e5]">DATE</th>
                      <th className="text-left p-4 text-xs font-bold dark:text-[#e5e5e5]">EXPLORER</th>
                      <th className="text-left p-4 text-xs font-bold dark:text-[#e5e5e5]">TYPE</th>
                      <th className="text-right p-4 text-xs font-bold dark:text-[#e5e5e5]">AMOUNT</th>
                      <th className="text-center p-4 text-xs font-bold dark:text-[#e5e5e5]">STATUS</th>
                      <th className="text-center p-4 text-xs font-bold dark:text-[#e5e5e5]">DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((payment) => (
                      <>
                        <tr
                          key={payment.id}
                          className="border-b border-[#b5bcc4] dark:border-[#616161] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all"
                        >
                          <td className="p-4 text-sm font-mono dark:text-[#e5e5e5]">
                            {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-sm dark:text-[#e5e5e5]">
                              {payment.sponsoredExplorer?.name || payment.sponsoredExplorer?.username || 'Unknown'}
                            </div>
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                              @{payment.sponsoredExplorer?.username}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] text-xs font-mono dark:text-[#e5e5e5]">
                              {payment.type === 'SUBSCRIPTION' ? (
                                <RefreshCw className="w-3 h-3" />
                              ) : (
                                <CreditCard className="w-3 h-3" />
                              )}
                              {payment.type === 'SUBSCRIPTION' ? 'subscription' : 'one-time'}
                            </div>
                          </td>
                          <td className="p-4 text-right font-bold text-lg dark:text-[#e5e5e5]">
                            ${(payment.amount).toFixed(2)}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`inline-block px-2 py-1 text-xs font-bold ${
                                payment.status === 'ACTIVE' || payment.status === 'CONFIRMED'
                                  ? 'bg-[#4676ac] text-white'
                                  : payment.status === 'CANCELED'
                                  ? 'bg-[#616161] text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {payment.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() =>
                                setExpandedTransaction(expandedTransaction === payment.id ? null : payment.id)
                              }
                              className="p-2 hover:bg-[#b5bcc4] dark:hover:bg-[#616161] transition-all dark:text-[#e5e5e5]"
                            >
                              {expandedTransaction === payment.id ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Details */}
                        {expandedTransaction === payment.id && (
                          <tr className="bg-[#f0f4f8] dark:bg-[#1a2a3a] border-b-2 border-[#202020] dark:border-[#616161]">
                            <td colSpan={6} className="p-6">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-bold text-sm mb-3 dark:text-[#e5e5e5]">TRANSACTION DETAILS:</h4>
                                  <div className="space-y-2 text-xs font-mono">
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">Transaction ID:</span>
                                      <span className="font-bold dark:text-[#e5e5e5]">{payment.id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">Date & Time:</span>
                                      <span className="font-bold dark:text-[#e5e5e5]">
                                        {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">Type:</span>
                                      <span className="font-bold dark:text-[#e5e5e5]">{payment.type}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">Currency:</span>
                                      <span className="font-bold dark:text-[#e5e5e5]">{payment.currency}</span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-bold text-sm mb-3 dark:text-[#e5e5e5]">FEE BREAKDOWN:</h4>
                                  <div className="space-y-2 text-xs font-mono">
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">Your payment:</span>
                                      <span className="font-bold dark:text-[#e5e5e5]">
                                        ${(payment.amount).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">Platform fee (5%):</span>
                                      <span className="text-[#ac6d46]">
                                        -${((payment.amount) * 0.05).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">
                                        Stripe fee (~2.9% + $0.30):
                                      </span>
                                      <span className="text-[#ac6d46]">
                                        -${((payment.amount) * 0.029 + 0.3).toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-[#b5bcc4] dark:border-[#616161]">
                                      <span className="font-bold dark:text-[#e5e5e5]">Explorer received:</span>
                                      <span className="font-bold text-[#ac6d46]">
                                        $
                                        {(
                                          payment.amount -
                                          (payment.amount) * 0.05 -
                                          ((payment.amount) * 0.029 + 0.3)
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {payment.message && (
                                <div className="mt-4">
                                  <h4 className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">YOUR MESSAGE:</h4>
                                  <div className="p-3 bg-white dark:bg-[#202020] border-l-4 border-[#4676ac] text-sm italic dark:text-[#b5bcc4]">
                                    "{payment.message}"
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Received Sponsorships Tab (Explorer Pro Only) */}
      {activeTab === 'received' && isPro && (
        <div className="space-y-6">
          <div className="bg-[#f0f4f8] dark:bg-[#1a2a3a] border-2 border-[#4676ac] p-6">
            <h3 className="font-bold mb-2 dark:text-[#e5e5e5]">EXPLORER PRO REVENUE DASHBOARD</h3>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
              Track sponsorships received from your supporters. Manage your sponsorship settings from the{' '}
              <Link href="/sponsorships-admin" className="text-[#4676ac] hover:underline">
                Sponsorship Admin
              </Link>{' '}
              page.
            </p>
          </div>

          {/* Revenue Stats */}
          {balance && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4]">AVAILABLE BALANCE</h4>
                  <DollarSign className="w-5 h-5 text-[#ac6d46]" />
                </div>
                <div className="text-3xl font-bold text-[#ac6d46]">
                  {balance.available.symbol}
                  {(balance.available.amount).toFixed(2)}
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Ready for payout</div>
              </div>

              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4]">PENDING</h4>
                  <TrendingUp className="w-5 h-5 text-[#4676ac]" />
                </div>
                <div className="text-3xl font-bold dark:text-[#e5e5e5]">
                  {balance.pending.symbol}
                  {(balance.pending.amount).toFixed(2)}
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Processing</div>
              </div>

              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#616161] dark:text-[#b5bcc4]">TOTAL SPONSORS</h4>
                  <Users className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4]" />
                </div>
                <div className="text-3xl font-bold dark:text-[#e5e5e5]">{receivedSponsorships.length}</div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">All time</div>
              </div>
            </div>
          )}

          {/* Sponsors List */}
          {receivedSponsorships.length === 0 ? (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
              <Users className="w-16 h-16 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
              <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">No Sponsors Yet</h3>
              <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
                You haven't received any sponsorships yet. Make sure your{' '}
                <Link href="/sponsorships-admin" className="text-[#4676ac] hover:underline">
                  sponsorship settings
                </Link>{' '}
                are configured.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
              <div className="bg-[#616161] dark:bg-[#3a3a3a] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                <h3 className="text-sm font-bold">YOUR SPONSORS ({receivedSponsorships.length})</h3>
              </div>

              <div className="p-6 space-y-4">
                {receivedSponsorships.map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className="pb-4 border-b-2 border-[#202020] dark:border-[#616161] last:border-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg dark:text-[#e5e5e5]">
                            {sponsor.sponsor?.name || sponsor.sponsor?.username || 'Anonymous'}
                          </h4>
                          <span
                            className={`px-2 py-1 text-xs font-bold ${
                              sponsor.status === 'ACTIVE'
                                ? 'bg-[#4676ac] text-white'
                                : 'bg-[#b5bcc4] text-[#202020]'
                            }`}
                          >
                            {sponsor.status}
                          </span>
                        </div>
                        <div className="text-sm text-[#616161] dark:text-[#b5bcc4]">
                          {sponsor.type === 'SUBSCRIPTION' ? 'Monthly subscription' : 'One-time sponsorship'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#ac6d46]">
                          ${(sponsor.amount).toFixed(2)}
                          {sponsor.type === 'SUBSCRIPTION' && <span className="text-sm">/mo</span>}
                        </div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                          Since {sponsor.createdAt ? new Date(sponsor.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {sponsor.message && (
                      <div className="p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac] text-sm italic dark:text-[#b5bcc4]">
                        "{sponsor.message}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Link to Admin */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
            <h3 className="font-bold mb-4 dark:text-[#e5e5e5]">MANAGE YOUR SPONSORSHIP SETTINGS</h3>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
              Configure your sponsorship tiers, connect Stripe, manage payouts, and more.
            </p>
            <Link
              href="/sponsorships-admin"
              className="inline-block px-6 py-3 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all font-bold"
            >
              GO TO SPONSORSHIP ADMIN
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
