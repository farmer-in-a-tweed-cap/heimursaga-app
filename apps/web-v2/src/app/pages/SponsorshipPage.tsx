'use client';

import { Fragment, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import {
  HandHeart,
  DollarSign,
  RefreshCw,
  Users,
  CreditCard,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pause,
  Play,
  X,
  Loader2,
} from 'lucide-react';
import { sponsorshipApi, type SponsorshipFull } from '@/app/services/api';
import { toast } from 'sonner';
import { SponsorshipsAdminPage } from './SponsorshipsAdminPage';

type MainTab = 'incoming' | 'outgoing';
type OutgoingSubTab = 'overview' | 'active' | 'history';

export function SponsorshipPage() {
  const { isAuthenticated } = useAuth();
  const { isPro } = useProFeatures();
  const [mainTab, setMainTab] = useState<MainTab>(isPro ? 'incoming' : 'outgoing');

  // Outgoing state
  const [outgoingSubTab, setOutgoingSubTab] = useState<OutgoingSubTab>('overview');
  const [mySponsorships, setMySponsorships] = useState<SponsorshipFull[]>([]);
  const [isLoadingOutgoing, setIsLoadingOutgoing] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [togglingEmailId, setTogglingEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);

  // Cancel confirmation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // Fetch outgoing data
  useEffect(() => {
    if (isAuthenticated) {
      fetchOutgoingData();
    }
  }, [isAuthenticated]);

  const fetchOutgoingData = async () => {
    setIsLoadingOutgoing(true);
    try {
      const res = await sponsorshipApi.getMySponsorships().catch(() => ({ results: 0, data: [] }));
      setMySponsorships(res.data || []);
    } catch {
      toast.error('Failed to load sponsorship data');
    } finally {
      setIsLoadingOutgoing(false);
    }
  };

  const handleCancelSponsorship = (sponsorshipId: string) => {
    setCancelTarget(sponsorshipId);
    setShowCancelModal(true);
  };

  const confirmCancelSponsorship = async () => {
    if (!cancelTarget) return;
    setCancelingId(cancelTarget);
    setShowCancelModal(false);
    try {
      await sponsorshipApi.cancelSponsorship(cancelTarget);
      toast.success('Sponsorship canceled successfully');
      fetchOutgoingData();
    } catch {
      toast.error('Failed to cancel sponsorship');
    } finally {
      setCancelingId(null);
      setCancelTarget(null);
    }
  };

  const handleToggleEmailDelivery = async (sponsorshipId: string, currentEnabled: boolean) => {
    setTogglingEmailId(sponsorshipId);
    try {
      await sponsorshipApi.toggleEmailDelivery(sponsorshipId, !currentEnabled);
      toast.success(`Email updates ${!currentEnabled ? 'enabled' : 'disabled'}`);
      fetchOutgoingData();
    } catch {
      toast.error('Failed to update email settings');
    } finally {
      setTogglingEmailId(null);
    }
  };

  // Computed values for outgoing
  const activeSubscriptions = mySponsorships.filter(
    (s) => s.type?.toUpperCase() === 'SUBSCRIPTION' && s.status?.toUpperCase() === 'ACTIVE'
  );
  const totalActiveSubscriptions = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
  const totalSponsored = mySponsorships.reduce((sum, sp) => sum + sp.amount, 0);
  const totalExpeditionsSupported = new Set(
    mySponsorships.map((s) => s.sponsoredExplorer?.username).filter(Boolean)
  ).size;

  const filteredHistory = searchQuery
    ? mySponsorships.filter(
        (p) =>
          p.sponsoredExplorer?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sponsoredExplorer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : mySponsorships;

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-8">
          <h1 className="text-2xl font-bold mb-4 dark:text-[#e5e5e5]">AUTHENTICATION REQUIRED</h1>
          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
            You must be logged in to manage your sponsorships.
          </p>
          <Link
            href="/auth"
            className="inline-block px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all"
          >
            LOG IN / SIGN UP
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">

      {/* Cancel Confirmation Modal */}
      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b-2 border-[#202020] dark:border-[#616161]">
              <h2 className="text-lg font-bold dark:text-[#e5e5e5]">CANCEL SPONSORSHIP</h2>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelTarget(null);
                }}
                className="p-1 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all"
              >
                <X className="w-5 h-5 dark:text-[#e5e5e5]" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">
                Are you sure you want to cancel this sponsorship? This action cannot be undone.
              </p>
              <div className="p-3 bg-[#fff5f0] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                <strong className="dark:text-[#e5e5e5]">Note:</strong> Your subscription will remain
                active until the end of the current billing period. No refunds for partial months.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelTarget(null);
                  }}
                  className="flex-1 py-3 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all dark:text-[#e5e5e5]"
                >
                  KEEP SPONSORSHIP
                </button>
                <button
                  onClick={confirmCancelSponsorship}
                  className="flex-1 py-3 bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
                >
                  CANCEL SPONSORSHIP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
            <div className="flex items-center gap-3">
              <HandHeart className="w-6 h-6 text-[#ac6d46]" />
              <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">SPONSORSHIP MANAGEMENT</h1>
            </div>
            {isPro && (
              <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">EXPLORER PRO</span>
            )}
          </div>
          <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
            {isPro
              ? 'Manage your incoming sponsorships and outgoing contributions'
              : 'Manage your sponsorship contributions and subscriptions'}
          </p>
        </div>
      </div>

      {/* Pro Binary Tab Selector */}
      {isPro && (
        <div className="grid grid-cols-2 gap-0 border-2 border-[#202020] dark:border-[#616161] overflow-hidden mb-6">
          <button
            onClick={() => setMainTab('incoming')}
            className={`p-4 transition-all text-sm ${
              mainTab === 'incoming'
                ? 'bg-[#ac6d46] border-r-2 border-[#202020] dark:border-[#616161] text-white'
                : 'bg-white dark:bg-[#202020] border-r-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-bold">INCOMING</span>
            </div>
          </button>
          <button
            onClick={() => setMainTab('outgoing')}
            className={`p-4 transition-all text-sm ${
              mainTab === 'outgoing'
                ? 'bg-[#4676ac] text-white'
                : 'bg-white dark:bg-[#202020] text-[#202020] dark:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-bold">OUTGOING</span>
            </div>
          </button>
        </div>
      )}

      {/* INCOMING Tab Content (Pro Only) */}
      {mainTab === 'incoming' && isPro && <SponsorshipsAdminPage embedded />}

      {/* OUTGOING Tab Content */}
      {(mainTab === 'outgoing' || !isPro) && (
        <>
          {isLoadingOutgoing ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#616161]" />
              <p className="mt-4 text-[#616161] dark:text-[#b5bcc4]">Loading your sponsorships...</p>
            </div>
          ) : (
            <>
              {/* Outgoing Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-[#4676ac]" />
                    <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                      TOTAL SPONSORED
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-[#4676ac]">
                    ${totalSponsored.toFixed(2)}
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    All-time contributions
                  </div>
                </div>

                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-[#616161]" />
                    <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                      ACTIVE SUBSCRIPTIONS
                    </div>
                  </div>
                  <div className="text-3xl font-bold dark:text-[#e5e5e5]">
                    ${totalActiveSubscriptions.toFixed(2)}
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                    {activeSubscriptions.length} subscriptions/mo
                  </div>
                </div>

                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-[#616161]" />
                    <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                      EXPLORERS SUPPORTED
                    </div>
                  </div>
                  <div className="text-3xl font-bold dark:text-[#e5e5e5]">
                    {totalExpeditionsSupported}
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Unique explorers</div>
                </div>

                <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-[#616161]" />
                    <div className="text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                      TRANSACTIONS
                    </div>
                  </div>
                  <div className="text-3xl font-bold dark:text-[#e5e5e5]">{mySponsorships.length}</div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Total payments</div>
                </div>
              </div>

              {/* Outgoing Sub-Tab Navigation */}
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6">
                <div className="border-b-2 border-[#202020] dark:border-[#616161] flex overflow-x-auto">
                  {(['overview', 'active', 'history'] as OutgoingSubTab[]).map((tab) => {
                    const labels: Record<OutgoingSubTab, string> = {
                      overview: 'OVERVIEW',
                      active: `ACTIVE (${activeSubscriptions.length})`,
                      history: `HISTORY (${mySponsorships.length})`,
                    };
                    return (
                      <button
                        key={tab}
                        onClick={() => setOutgoingSubTab(tab)}
                        className={`flex-1 py-3 px-4 text-sm font-bold whitespace-nowrap border-r-2 border-[#202020] dark:border-[#616161] last:border-r-0 ${
                          outgoingSubTab === tab
                            ? 'bg-[#4676ac] text-white'
                            : 'bg-[#b5bcc4] dark:bg-[#3a3a3a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#95a2aa] dark:hover:bg-[#4a4a4a]'
                        } transition-all`}
                      >
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>

                <div className="p-6">
                  {/* OVERVIEW Sub-Tab */}
                  {outgoingSubTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Quick Actions */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link
                          href="/expeditions"
                          className="p-4 border-2 border-[#ac6d46] hover:bg-[#ac6d46] hover:text-white transition-all text-center font-bold dark:text-[#e5e5e5]"
                        >
                          FIND NEW EXPEDITIONS
                        </Link>
                        <button
                          onClick={() => setOutgoingSubTab('active')}
                          className="p-4 border-2 border-[#4676ac] hover:bg-[#4676ac] hover:text-white transition-all font-bold dark:text-[#e5e5e5]"
                        >
                          MANAGE SUBSCRIPTIONS
                        </button>
                        <button
                          onClick={() => setOutgoingSubTab('history')}
                          className="p-4 border-2 border-[#202020] dark:border-[#616161] hover:bg-[#b5bcc4] dark:hover:bg-[#2a2a2a] transition-all font-bold dark:text-[#e5e5e5]"
                        >
                          VIEW PAYMENT HISTORY
                        </button>
                      </div>

                      {/* Recent Sponsorships */}
                      {mySponsorships.length === 0 ? (
                        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
                          <DollarSign className="w-16 h-16 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
                          <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">
                            No Sponsorships Yet
                          </h3>
                          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
                            You haven't sponsored any explorers yet. Browse expeditions to find
                            explorers to support.
                          </p>
                          <Link
                            href="/expeditions"
                            className="inline-block px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all"
                          >
                            BROWSE EXPEDITIONS
                          </Link>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                          <div className="bg-[#b5bcc4] dark:bg-[#3a3a3a] p-4 border-b-2 border-[#202020] dark:border-[#616161]">
                            <h3 className="text-sm font-bold dark:text-[#e5e5e5]">
                              RECENT SPONSORSHIPS
                            </h3>
                          </div>
                          <div className="p-4">
                            <div className="space-y-2">
                              {mySponsorships.slice(0, 5).map((sp) => (
                                <div
                                  key={sp.id}
                                  className="flex items-center justify-between p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-4 border-[#ac6d46]"
                                >
                                  <div>
                                    <div className="font-bold text-sm dark:text-[#e5e5e5]">
                                      {sp.sponsoredExplorer?.username ? (
                                        <Link
                                          href={`/journal/${sp.sponsoredExplorer.username}`}
                                          className="text-[#4676ac] hover:underline"
                                        >
                                          {sp.sponsoredExplorer.username}
                                        </Link>
                                      ) : (
                                        sp.sponsoredExplorer?.name || 'Unknown Explorer'
                                      )}
                                    </div>
                                    <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                                      {sp.createdAt
                                        ? new Date(sp.createdAt).toLocaleDateString()
                                        : 'N/A'}
                                      {' · '}
                                      {sp.type?.toUpperCase() === 'SUBSCRIPTION' ? 'Monthly' : 'One-time'}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-[#4676ac]">
                                      ${sp.amount.toFixed(2)}
                                      {sp.type?.toUpperCase() === 'SUBSCRIPTION' && (
                                        <span className="text-xs">/mo</span>
                                      )}
                                    </div>
                                    <span
                                      className={`px-2 py-0.5 text-xs font-bold ${
                                        sp.status?.toUpperCase() === 'ACTIVE' ? 'bg-green-600' : 'bg-[#616161]'
                                      } text-white`}
                                    >
                                      {sp.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => setOutgoingSubTab('history')}
                              className="w-full mt-4 py-2 border-2 border-[#202020] dark:border-[#616161] font-bold text-sm hover:bg-[#202020] hover:text-white dark:hover:bg-[#616161] transition-all dark:text-[#e5e5e5]"
                            >
                              VIEW ALL PAYMENTS
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACTIVE SUBSCRIPTIONS Sub-Tab */}
                  {outgoingSubTab === 'active' && (
                    <div>
                      {activeSubscriptions.length === 0 ? (
                        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
                          <RefreshCw className="w-16 h-16 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
                          <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">
                            No Active Subscriptions
                          </h3>
                          <p className="text-[#616161] dark:text-[#b5bcc4] mb-6">
                            You don't have any active recurring sponsorships.
                          </p>
                          <Link
                            href="/expeditions"
                            className="inline-block px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all"
                          >
                            BROWSE EXPEDITIONS
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activeSubscriptions.map((sub) => (
                            <div
                              key={sub.id}
                              className="bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161]"
                            >
                              <div className="p-4 border-b border-[#b5bcc4] dark:border-[#616161]">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="px-2 py-0.5 bg-[#4676ac] text-white text-xs font-bold">
                                        {sub.status}
                                      </span>
                                      <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                                        ID: {sub.id.substring(0, 8)}...
                                      </span>
                                    </div>
                                    <Link
                                      href={`/journal/${sub.sponsoredExplorer?.username}`}
                                      className="text-lg font-bold hover:text-[#ac6d46] transition-all inline-flex items-center gap-2 dark:text-[#e5e5e5]"
                                    >
                                      {sub.sponsoredExplorer?.username || 'Unknown Explorer'}
                                      <ExternalLink className="w-4 h-4" />
                                    </Link>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-[#4676ac]">
                                      ${sub.amount.toFixed(2)}
                                      <span className="text-sm">/mo</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4">
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                  <div className="space-y-2 text-sm font-mono">
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">
                                        Start date:
                                      </span>
                                      <span className="font-bold dark:text-[#e5e5e5]">
                                        {sub.createdAt
                                          ? new Date(sub.createdAt).toLocaleDateString()
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">
                                        Next billing:
                                      </span>
                                      <span className="font-bold text-[#4676ac]">
                                        {sub.expiry
                                          ? new Date(sub.expiry).toLocaleDateString()
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#616161] dark:text-[#b5bcc4]">
                                        Email updates:
                                      </span>
                                      <span className="font-bold dark:text-[#e5e5e5]">
                                        {sub.emailDeliveryEnabled ? 'Enabled' : 'Disabled'}
                                      </span>
                                    </div>
                                  </div>
                                  {sub.message && (
                                    <div>
                                      <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">
                                        YOUR MESSAGE:
                                      </div>
                                      <div className="p-3 bg-white dark:bg-[#202020] border-l-4 border-[#ac6d46] text-sm italic dark:text-[#b5bcc4]">
                                        "{sub.message}"
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-3 pt-4 border-t border-[#b5bcc4] dark:border-[#616161]">
                                  <Link
                                    href={`/journal/${sub.sponsoredExplorer?.username}`}
                                    className="px-4 py-2 bg-[#4676ac] text-white text-xs font-bold hover:bg-[#365a87] transition-all flex items-center gap-2"
                                  >
                                    <ExternalLink className="w-4 h-4" /> VIEW JOURNAL
                                  </Link>
                                  <button
                                    onClick={() =>
                                      handleToggleEmailDelivery(sub.id, sub.emailDeliveryEnabled)
                                    }
                                    disabled={togglingEmailId === sub.id}
                                    className="px-4 py-2 border-2 border-[#616161] text-xs font-bold hover:bg-[#616161] hover:text-white transition-all flex items-center gap-2 disabled:opacity-50 dark:text-[#e5e5e5]"
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
                                    className="px-4 py-2 border-2 border-red-500 text-red-500 text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
                                  >
                                    {cancelingId === sub.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <X className="w-4 h-4" />
                                    )}
                                    CANCEL
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PAYMENT HISTORY Sub-Tab */}
                  {outgoingSubTab === 'history' && (
                    <div className="space-y-4">
                      {/* Search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#616161]" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by explorer or transaction ID..."
                          className="w-full pl-10 pr-4 py-2 border-2 border-[#b5bcc4] dark:border-[#616161] focus:border-[#ac6d46] outline-none bg-white dark:bg-[#2a2a2a] dark:text-[#e5e5e5]"
                        />
                      </div>

                      {filteredHistory.length === 0 ? (
                        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-12 text-center">
                          <CreditCard className="w-16 h-16 mx-auto mb-4 text-[#616161] dark:text-[#b5bcc4]" />
                          <h3 className="text-xl font-bold mb-2 dark:text-[#e5e5e5]">
                            No Payment History
                          </h3>
                          <p className="text-[#616161] dark:text-[#b5bcc4]">
                            {searchQuery
                              ? 'No payments match your search.'
                              : 'You have no payment history yet.'}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="bg-[#b5bcc4] dark:bg-[#3a3a3a]">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">
                                    DATE
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">
                                    EXPLORER
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">
                                    TYPE
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">
                                    AMOUNT
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">
                                    STATUS
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-bold dark:text-[#e5e5e5]">
                                    DETAILS
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredHistory.map((payment) => (
                                  <Fragment key={payment.id}>
                                    <tr className="border-t-2 border-[#b5bcc4] dark:border-[#616161]">
                                      <td className="px-4 py-3 text-sm font-mono dark:text-[#e5e5e5]">
                                        {payment.createdAt
                                          ? new Date(payment.createdAt).toLocaleDateString()
                                          : 'N/A'}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="font-bold text-sm dark:text-[#e5e5e5]">
                                          {payment.sponsoredExplorer?.username ? (
                                            <Link
                                              href={`/journal/${payment.sponsoredExplorer.username}`}
                                              className="text-[#4676ac] hover:underline"
                                            >
                                              {payment.sponsoredExplorer.username}
                                            </Link>
                                          ) : (
                                            payment.sponsoredExplorer?.name || 'Unknown'
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="px-2 py-1 text-xs font-mono bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] dark:text-[#e5e5e5]">
                                          {payment.type?.toUpperCase() === 'SUBSCRIPTION'
                                            ? 'Monthly'
                                            : 'One-time'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-bold text-[#4676ac]">
                                        ${payment.amount.toFixed(2)}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span
                                          className={`px-2 py-1 text-xs font-bold ${
                                            payment.status?.toUpperCase() === 'ACTIVE' ||
                                            payment.status?.toUpperCase() === 'CONFIRMED'
                                              ? 'bg-[#4676ac] text-white'
                                              : payment.status?.toUpperCase() === 'CANCELED'
                                              ? 'bg-[#616161] text-white'
                                              : 'bg-amber-500 text-white'
                                          }`}
                                        >
                                          {payment.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <button
                                          onClick={() =>
                                            setExpandedTransaction(
                                              expandedTransaction === payment.id
                                                ? null
                                                : payment.id
                                            )
                                          }
                                          className="p-1 hover:bg-[#b5bcc4] dark:hover:bg-[#616161] transition-all dark:text-[#e5e5e5]"
                                        >
                                          {expandedTransaction === payment.id ? (
                                            <ChevronUp className="w-5 h-5" />
                                          ) : (
                                            <ChevronDown className="w-5 h-5" />
                                          )}
                                        </button>
                                      </td>
                                    </tr>
                                    {expandedTransaction === payment.id && (
                                      <tr className="bg-[#fff5f0] dark:bg-[#2a2a2a] border-b-2 border-[#202020] dark:border-[#616161]">
                                        <td colSpan={6} className="p-6">
                                          <div className="grid md:grid-cols-2 gap-6">
                                            <div>
                                              <h4 className="font-bold text-sm mb-3 dark:text-[#e5e5e5]">
                                                TRANSACTION DETAILS:
                                              </h4>
                                              <div className="space-y-2 text-xs font-mono">
                                                <div className="flex justify-between">
                                                  <span className="text-[#616161] dark:text-[#b5bcc4]">
                                                    Transaction ID:
                                                  </span>
                                                  <span className="font-bold dark:text-[#e5e5e5]">
                                                    {payment.id}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#616161] dark:text-[#b5bcc4]">
                                                    Date & Time:
                                                  </span>
                                                  <span className="font-bold dark:text-[#e5e5e5]">
                                                    {payment.createdAt
                                                      ? new Date(
                                                          payment.createdAt
                                                        ).toLocaleString()
                                                      : 'N/A'}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#616161] dark:text-[#b5bcc4]">
                                                    Type:
                                                  </span>
                                                  <span className="font-bold dark:text-[#e5e5e5]">
                                                    {payment.type}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#616161] dark:text-[#b5bcc4]">
                                                    Currency:
                                                  </span>
                                                  <span className="font-bold dark:text-[#e5e5e5]">
                                                    {payment.currency}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                            <div>
                                              <h4 className="font-bold text-sm mb-3 dark:text-[#e5e5e5]">
                                                FEE BREAKDOWN:
                                              </h4>
                                              <div className="space-y-2 text-xs font-mono">
                                                <div className="flex justify-between">
                                                  <span className="text-[#616161] dark:text-[#b5bcc4]">
                                                    Your payment:
                                                  </span>
                                                  <span className="font-bold dark:text-[#e5e5e5]">
                                                    ${payment.amount.toFixed(2)}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#616161] dark:text-[#b5bcc4]">
                                                    Platform fee (5%):
                                                  </span>
                                                  <span className="text-[#ac6d46]">
                                                    -${(payment.amount * 0.05).toFixed(2)}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span className="text-[#616161] dark:text-[#b5bcc4]">
                                                    Stripe fee (~2.9% + $0.30):
                                                  </span>
                                                  <span className="text-[#ac6d46]">
                                                    -$
                                                    {(payment.amount * 0.029 + 0.3).toFixed(2)}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between pt-2 border-t border-[#b5bcc4] dark:border-[#616161]">
                                                  <span className="font-bold dark:text-[#e5e5e5]">
                                                    Explorer received:
                                                  </span>
                                                  <span className="font-bold text-[#4676ac]">
                                                    $
                                                    {(
                                                      payment.amount -
                                                      payment.amount * 0.05 -
                                                      (payment.amount * 0.029 + 0.3)
                                                    ).toFixed(2)}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          {payment.message && (
                                            <div className="mt-4">
                                              <h4 className="font-bold text-sm mb-2 dark:text-[#e5e5e5]">
                                                YOUR MESSAGE:
                                              </h4>
                                              <div className="p-3 bg-white dark:bg-[#202020] border-l-4 border-[#ac6d46] text-sm italic dark:text-[#b5bcc4]">
                                                "{payment.message}"
                                              </div>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
