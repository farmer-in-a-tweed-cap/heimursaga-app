'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Eye,
  FileText,
  Filter,
  Flag,
  Key,
  Loader2,
  Map,
  Search,
  Shield,
  Trash2,
  UserX,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import {
  adminApi,
  AdminEntryListItem,
  AdminExpeditionListItem,
  AdminExplorerListItem,
  AdminFlag,
  AdminInviteCode,
  AdminStats,
} from '@/app/services/api';

type ViewMode = 'flags' | 'entries' | 'expeditions' | 'explorers' | 'inviteCodes';

const PAGE_SIZE = 50;

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export function AdminDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('flags');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [flagStatusFilter, setFlagStatusFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Stats
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Flags
  const [flags, setFlags] = useState<AdminFlag[]>([]);
  const [flagsTotal, setFlagsTotal] = useState(0);
  const [flagsOffset, setFlagsOffset] = useState(0);
  const [flagsLoading, setFlagsLoading] = useState(false);

  // Entries
  const [entries, setEntries] = useState<AdminEntryListItem[]>([]);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [entriesOffset, setEntriesOffset] = useState(0);
  const [entriesLoading, setEntriesLoading] = useState(false);

  // Expeditions
  const [expeditions, setExpeditions] = useState<AdminExpeditionListItem[]>([]);
  const [expeditionsTotal, setExpeditionsTotal] = useState(0);
  const [expeditionsOffset, setExpeditionsOffset] = useState(0);
  const [expeditionsLoading, setExpeditionsLoading] = useState(false);

  // Explorers
  const [explorers, setExplorers] = useState<AdminExplorerListItem[]>([]);
  const [explorersTotal, setExplorersTotal] = useState(0);
  const [explorersOffset, setExplorersOffset] = useState(0);
  const [explorersLoading, setExplorersLoading] = useState(false);

  // Invite Codes
  const [inviteCodes, setInviteCodes] = useState<AdminInviteCode[]>([]);
  const [inviteCodesTotal, setInviteCodesTotal] = useState(0);
  const [inviteCodesOffset, setInviteCodesOffset] = useState(0);
  const [inviteCodesLoading, setInviteCodesLoading] = useState(false);
  const [newCodeLabel, setNewCodeLabel] = useState('');
  const [newCodeCount, setNewCodeCount] = useState(1);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  // Bulk selection
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [selectedExpeditions, setSelectedExpeditions] = useState<Set<string>>(new Set());
  const [selectedExplorers, setSelectedExplorers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Auth guard — only admins can access
  const isAdmin = !!user && user.admin === true;

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, authLoading, router]);

  // Load stats
  useEffect(() => {
    if (!isAdmin) return;
    adminApi.getStats().then(setStats).catch(console.error);
  }, [user, isAdmin]);

  // Load flags
  const loadFlags = useCallback(async () => {
    setFlagsLoading(true);
    try {
      const res = await adminApi.getFlags({
        status: flagStatusFilter || undefined,
        limit: PAGE_SIZE,
        offset: flagsOffset,
      });
      setFlags(res.flags);
      setFlagsTotal(res.total);
    } catch (e) {
      console.error('Failed to load flags', e);
    } finally {
      setFlagsLoading(false);
    }
  }, [flagStatusFilter, flagsOffset]);

  useEffect(() => {
    if (viewMode === 'flags' && isAdmin) loadFlags();
  }, [viewMode, user, loadFlags, isAdmin]);

  // Load entries
  const loadEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const res = await adminApi.getEntries({
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: entriesOffset,
      });
      setEntries(res.data);
      setEntriesTotal(res.total);
    } catch (e) {
      console.error('Failed to load entries', e);
    } finally {
      setEntriesLoading(false);
    }
  }, [debouncedSearch, entriesOffset]);

  useEffect(() => {
    if (viewMode === 'entries' && isAdmin) loadEntries();
  }, [viewMode, user, loadEntries, isAdmin]);

  // Load expeditions
  const loadExpeditions = useCallback(async () => {
    setExpeditionsLoading(true);
    try {
      const res = await adminApi.getExpeditions({
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: expeditionsOffset,
      });
      setExpeditions(res.data);
      setExpeditionsTotal(res.total);
    } catch (e) {
      console.error('Failed to load expeditions', e);
    } finally {
      setExpeditionsLoading(false);
    }
  }, [debouncedSearch, expeditionsOffset]);

  useEffect(() => {
    if (viewMode === 'expeditions' && isAdmin) loadExpeditions();
  }, [viewMode, user, loadExpeditions, isAdmin]);

  // Load explorers
  const loadExplorers = useCallback(async () => {
    setExplorersLoading(true);
    try {
      const res = await adminApi.getExplorers({
        search: debouncedSearch || undefined,
        limit: PAGE_SIZE,
        offset: explorersOffset,
      });
      setExplorers(res.data);
      setExplorersTotal(res.total);
    } catch (e) {
      console.error('Failed to load explorers', e);
    } finally {
      setExplorersLoading(false);
    }
  }, [debouncedSearch, explorersOffset]);

  useEffect(() => {
    if (viewMode === 'explorers' && isAdmin) loadExplorers();
  }, [viewMode, user, loadExplorers, isAdmin]);

  // Load invite codes
  const loadInviteCodes = useCallback(async () => {
    setInviteCodesLoading(true);
    try {
      const res = await adminApi.getInviteCodes({
        limit: PAGE_SIZE,
        offset: inviteCodesOffset,
      });
      setInviteCodes(res.data);
      setInviteCodesTotal(res.total);
    } catch (e) {
      console.error('Failed to load invite codes', e);
    } finally {
      setInviteCodesLoading(false);
    }
  }, [inviteCodesOffset]);

  useEffect(() => {
    if (viewMode === 'inviteCodes' && isAdmin) loadInviteCodes();
  }, [viewMode, user, loadInviteCodes, isAdmin]);

  // Reset offset when search changes
  useEffect(() => {
    setEntriesOffset(0);
    setExpeditionsOffset(0);
    setExplorersOffset(0);
  }, [debouncedSearch]);

  // Actions
  const handleReviewFlag = (flagId: string, action: 'approve' | 'dismiss') => {
    showConfirm(
      `Are you sure you want to ${action === 'approve' ? 'approve and take action on' : 'dismiss'} this flag?`,
      async () => {
        try {
          if (action === 'approve') {
            await adminApi.updateFlag(flagId, { status: 'action_taken', actionTaken: 'content_deleted' });
          } else {
            await adminApi.updateFlag(flagId, { status: 'dismissed' });
          }
          loadFlags();
          adminApi.getStats().then(setStats).catch(console.error);
        } catch (e) {
          console.error('Failed to update flag', e);
        }
      },
    );
  };

  const handleDeleteEntry = (id: string) => {
    showConfirm('Are you sure you want to delete this entry? This action soft-deletes the entry.', async () => {
      try {
        await adminApi.deleteEntry(id);
        loadEntries();
        adminApi.getStats().then(setStats).catch(console.error);
      } catch (e) {
        console.error('Failed to delete entry', e);
      }
    });
  };

  const handleDeleteExpedition = (id: string) => {
    showConfirm('Are you sure you want to delete this expedition? This action soft-deletes the expedition.', async () => {
      try {
        await adminApi.deleteExpedition(id);
        loadExpeditions();
        adminApi.getStats().then(setStats).catch(console.error);
      } catch (e) {
        console.error('Failed to delete expedition', e);
      }
    });
  };

  const handleBlockExplorer = (username: string) => {
    showConfirm(`Are you sure you want to block ${username}? This will also soft-delete their entries and expeditions.`, async () => {
      try {
        await adminApi.blockExplorer(username);
        loadExplorers();
        adminApi.getStats().then(setStats).catch(console.error);
      } catch (e) {
        console.error('Failed to block explorer', e);
      }
    });
  };

  const handleUnblockExplorer = (username: string) => {
    showConfirm(`Are you sure you want to unblock ${username}?`, async () => {
      try {
        await adminApi.unblockExplorer(username);
        loadExplorers();
        adminApi.getStats().then(setStats).catch(console.error);
      } catch (e) {
        console.error('Failed to unblock explorer', e);
      }
    });
  };

  // Clear selections when switching views or reloading
  useEffect(() => {
    setSelectedEntries(new Set());
    setSelectedExpeditions(new Set());
    setSelectedExplorers(new Set());
  }, [viewMode, debouncedSearch]);

  // Bulk actions
  const handleBulkDeleteEntries = () => {
    if (selectedEntries.size === 0) return;
    showConfirm(`Are you sure you want to delete ${selectedEntries.size} entries?`, async () => {
      setBulkActionLoading(true);
      try {
        await Promise.all([...selectedEntries].map(id => adminApi.deleteEntry(id)));
        setSelectedEntries(new Set());
        loadEntries();
        adminApi.getStats().then(setStats).catch(console.error);
      } catch (e) {
        console.error('Failed to bulk delete entries', e);
      } finally {
        setBulkActionLoading(false);
      }
    });
  };

  const handleBulkDeleteExpeditions = () => {
    if (selectedExpeditions.size === 0) return;
    showConfirm(`Are you sure you want to delete ${selectedExpeditions.size} expeditions?`, async () => {
      setBulkActionLoading(true);
      try {
        await Promise.all([...selectedExpeditions].map(id => adminApi.deleteExpedition(id)));
        setSelectedExpeditions(new Set());
        loadExpeditions();
        adminApi.getStats().then(setStats).catch(console.error);
      } catch (e) {
        console.error('Failed to bulk delete expeditions', e);
      } finally {
        setBulkActionLoading(false);
      }
    });
  };

  const handleBulkBlockExplorers = () => {
    if (selectedExplorers.size === 0) return;
    showConfirm(`Are you sure you want to block ${selectedExplorers.size} explorers?`, async () => {
      setBulkActionLoading(true);
      try {
        await Promise.all([...selectedExplorers].map(username => adminApi.blockExplorer(username)));
        setSelectedExplorers(new Set());
        loadExplorers();
        adminApi.getStats().then(setStats).catch(console.error);
      } catch (e) {
        console.error('Failed to bulk block explorers', e);
      } finally {
        setBulkActionLoading(false);
      }
    });
  };

  // Toggle helpers
  const toggleEntry = (id: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExpedition = (id: string) => {
    setSelectedExpeditions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExplorer = (username: string) => {
    setSelectedExplorers(prev => {
      const next = new Set(prev);
      next.has(username) ? next.delete(username) : next.add(username);
      return next;
    });
  };

  // Pagination helper
  const Pagination = ({ total, offset, setOffset, loading }: { total: number; offset: number; setOffset: (n: number) => void; loading: boolean }) => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-[#202020] dark:border-[#616161]">
        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
          {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0 || loading}
            className="p-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] disabled:opacity-30 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <span className="px-3 py-2 text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total || loading}
            className="p-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] disabled:opacity-30 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    );
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1a1a1a]">
        <Loader2 className="animate-spin text-[#ac6d46]" size={32} />
      </div>
    );
  }

  const pendingFlagsCount = stats?.pendingFlags ?? 0;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Header */}
      <div className="bg-[#202020] text-white border-2 border-[#202020] dark:border-[#616161] mb-6 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={32} strokeWidth={2.5} className="text-[#ac6d46]" />
          <h1 className="text-2xl font-bold">ADMIN DASHBOARD</h1>
        </div>

        <div className="text-xs text-[#b5bcc4] font-mono space-y-1">
          <div>SYSTEM STATUS: OPERATIONAL • TIMESTAMP: {new Date().toISOString()}</div>
          <div>
            PENDING FLAGS: {pendingFlagsCount} •
            TOTAL ENTRIES: {stats?.entries ?? '...'} •
            TOTAL EXPEDITIONS: {stats?.expeditions ?? '...'} •
            TOTAL EXPLORERS: {stats?.explorers ?? '...'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] mb-6">
          <div className="flex gap-1">
            {([
              { key: 'flags' as const, icon: Flag, label: 'FLAGS & REPORTS', badge: pendingFlagsCount },
              { key: 'entries' as const, icon: FileText, label: 'ENTRIES' },
              { key: 'expeditions' as const, icon: Map, label: 'EXPEDITIONS' },
              { key: 'explorers' as const, icon: Users, label: 'EXPLORERS' },
              { key: 'inviteCodes' as const, icon: Key, label: 'INVITE CODES' },
            ]).map(({ key, icon: Icon, label, badge }) => (
              <button
                key={key}
                onClick={() => { setViewMode(key); setSearchQuery(''); }}
                className={`px-6 py-3 text-sm font-bold transition-colors relative ${
                  viewMode === key
                    ? 'bg-white dark:bg-[#202020] text-[#ac6d46] border-t-4 border-[#ac6d46]'
                    : 'bg-transparent text-[#616161] dark:text-[#b5bcc4] hover:bg-[#e5e5e5] dark:hover:bg-[#3a3a3a]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} strokeWidth={2.5} />
                  <span>{label}</span>
                  {badge != null && badge > 0 && (
                    <span className="bg-[#ac6d46] text-white text-xs px-2 py-0.5 rounded-sm font-bold">
                      {badge}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] mb-6 p-4">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#616161]" strokeWidth={2.5} />
              <input
                type="text"
                placeholder={viewMode === 'flags' ? 'Search flags...' : `Search ${viewMode}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] text-sm font-mono focus:outline-none focus:border-[#ac6d46]"
              />
            </div>
            {viewMode === 'flags' && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors text-sm font-bold flex items-center gap-2"
              >
                <Filter size={16} strokeWidth={2.5} />
                FILTERS
              </button>
            )}
          </div>
          {showFilters && viewMode === 'flags' && (
            <div className="mt-3 flex gap-2">
              {['', 'pending', 'reviewed', 'dismissed', 'action_taken'].map((status) => (
                <button
                  key={status}
                  onClick={() => { setFlagStatusFilter(status); setFlagsOffset(0); }}
                  className={`px-3 py-1 text-xs font-bold border-2 transition-colors ${
                    flagStatusFilter === status
                      ? 'border-[#ac6d46] bg-[#ac6d46] text-white'
                      : 'border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a]'
                  }`}
                >
                  {status ? status.toUpperCase().replace('_', ' ') : 'ALL'}
                </button>
              ))}
            </div>
          )}
      </div>

      {/* Content Area */}
      <div>
        {/* FLAGS VIEW */}
        {viewMode === 'flags' && (
          <div className="space-y-4">
            <div className="bg-[#fff7f0] dark:bg-[#2a2a2a] border-2 border-[#ac6d46] p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-[#ac6d46] mt-0.5" strokeWidth={2.5} />
                <div className="flex-1">
                  <div className="font-bold text-sm text-[#202020] dark:text-[#e5e5e5] mb-1">
                    USER-SUBMITTED REPORTS
                  </div>
                  <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                    Review and moderate content flags submitted by the community. Pending flags require immediate attention.
                  </div>
                </div>
              </div>
            </div>

            {/* Flag Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 bg-white dark:bg-[#2a2a2a]">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-bold">PENDING REVIEW</div>
                <div className="text-3xl font-medium text-[#ac6d46]">{stats?.pendingFlags ?? 0}</div>
              </div>
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 bg-white dark:bg-[#2a2a2a]">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-bold">TOTAL ENTRIES</div>
                <div className="text-3xl font-medium text-[#4676ac]">{stats?.entries ?? 0}</div>
              </div>
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 bg-white dark:bg-[#2a2a2a]">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-bold">BLOCKED EXPLORERS</div>
                <div className="text-3xl font-medium text-[#616161] dark:text-[#b5bcc4]">{stats?.blockedExplorers ?? 0}</div>
              </div>
            </div>

            {/* Flags List */}
            {flagsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[#ac6d46]" size={24} />
              </div>
            ) : flags.length === 0 ? (
              <div className="text-center py-12 text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
                NO FLAGS FOUND
              </div>
            ) : (
              <div className="space-y-3">
                {[...flags].sort((a, b) => {
                  const order: Record<string, number> = { pending: 0, reviewed: 1, dismissed: 2, action_taken: 3 };
                  return (order[a.status] ?? 9) - (order[b.status] ?? 9);
                }).map((flag) => (
                  <div
                    key={flag.id}
                    className={`border-2 ${
                      flag.status === 'pending'
                        ? 'border-[#ac6d46] bg-[#fff7f0] dark:bg-[#2a2a2a]'
                        : 'border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a]'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs font-bold px-2 py-1 ${
                              flag.status === 'pending'
                                ? 'bg-[#ac6d46] text-white'
                                : flag.status === 'action_taken'
                                ? 'bg-[#4676ac] text-white'
                                : 'bg-[#616161] text-white'
                            }`}>
                              {flag.status.toUpperCase().replace('_', ' ')}
                            </span>
                            <span className="text-xs font-bold px-2 py-1 bg-[#202020] text-white">
                              {flag.category.toUpperCase().replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                              {flag.id}
                            </span>
                          </div>
                          <div className="mb-2">
                            <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">TARGET: </span>
                            <span className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
                              {(flag.flaggedContent.type === 'post' ? 'ENTRY' : flag.flaggedContent.type.toUpperCase())} • {flag.flaggedContent.preview}
                            </span>
                          </div>
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono mb-2">
                            REPORTED BY: {flag.reporter.username} • {new Date(flag.createdAt).toLocaleDateString()}
                          </div>
                          {flag.reviewedBy && (
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                              REVIEWED BY: {flag.reviewedBy.username} {flag.reviewedAt && `• ${new Date(flag.reviewedAt).toLocaleDateString()}`}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setExpandedFlag(expandedFlag === flag.id ? null : flag.id)}
                          className="p-2 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors"
                        >
                          {expandedFlag === flag.id ? (
                            <ChevronUp size={20} strokeWidth={2.5} className="text-[#616161]" />
                          ) : (
                            <ChevronDown size={20} strokeWidth={2.5} className="text-[#616161]" />
                          )}
                        </button>
                      </div>

                      {expandedFlag === flag.id && (
                        <div className="border-t-2 border-[#202020] dark:border-[#616161] pt-3 mt-3">
                          {flag.description && (
                            <div className="mb-3">
                              <div className="text-xs font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                                REASON FOR REPORT:
                              </div>
                              <div className="text-sm text-[#202020] dark:text-[#e5e5e5] leading-relaxed bg-[#f5f5f5] dark:bg-[#1a1a1a] p-3 border-l-4 border-[#ac6d46]">
                                {flag.description}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Link
                              href={
                                flag.flaggedContent.type === 'expedition'
                                  ? `/expedition/${flag.flaggedContent.id}`
                                  : flag.flaggedContent.type === 'explorer'
                                  ? `/journal/${flag.flaggedContent.id}`
                                  : `/entry/${flag.flaggedContent.id}`
                              }
                              className="px-4 py-2 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-colors text-xs font-bold flex items-center gap-2"
                            >
                              <Eye size={14} strokeWidth={2.5} />
                              VIEW {flag.flaggedContent.type.toUpperCase()}
                            </Link>
                            {flag.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleReviewFlag(flag.id, 'approve')}
                                  className="px-4 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors text-xs font-bold flex items-center gap-2"
                                >
                                  <CheckCircle size={14} strokeWidth={2.5} />
                                  APPROVE & DELETE CONTENT
                                </button>
                                <button
                                  onClick={() => handleReviewFlag(flag.id, 'dismiss')}
                                  className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors text-xs font-bold flex items-center gap-2"
                                >
                                  <XCircle size={14} strokeWidth={2.5} />
                                  DISMISS FLAG
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Pagination total={flagsTotal} offset={flagsOffset} setOffset={setFlagsOffset} loading={flagsLoading} />
          </div>
        )}

        {/* ENTRIES VIEW */}
        {viewMode === 'entries' && (
          <div>
            {entriesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[#ac6d46]" size={24} />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
                NO ENTRIES FOUND
              </div>
            ) : (
              <>
                {selectedEntries.size > 0 && (
                  <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-[#4676ac] text-white border-2 border-[#202020]">
                    <span className="text-xs font-bold">{selectedEntries.size} SELECTED</span>
                    <button
                      onClick={handleBulkDeleteEntries}
                      disabled={bulkActionLoading}
                      className="px-3 py-1.5 bg-[#994040] text-white text-xs font-bold hover:bg-[#7a3333] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {bulkActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      DELETE
                    </button>
                    <button
                      onClick={() => setSelectedEntries(new Set())}
                      className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors"
                    >
                      CLEAR
                    </button>
                  </div>
                )}
                <div className="overflow-x-auto border-2 border-[#202020] dark:border-[#616161]">
                <table className="w-full bg-white dark:bg-[#2a2a2a]">
                  <thead>
                    <tr className="bg-[#202020] text-white">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={entries.filter(e => !e.deletedAt).length > 0 && entries.filter(e => !e.deletedAt).every(e => selectedEntries.has(e.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedEntries(new Set(entries.filter(en => !en.deletedAt).map(en => en.id)));
                            } else {
                              setSelectedEntries(new Set());
                            }
                          }}
                          className="accent-[#4676ac]"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold">ENTRY ID</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">TITLE</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">EXPLORER</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">CREATED</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">STATUS</th>
                      <th className="text-center px-4 py-3 text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className={`border-t-2 border-[#202020] dark:border-[#616161] ${
                          entry.deletedAt
                            ? 'opacity-40'
                            : index % 2 === 0 ? 'bg-white dark:bg-[#2a2a2a]' : 'bg-[#f5f5f5] dark:bg-[#1a1a1a]'
                        }`}
                      >
                        <td className="px-4 py-3">
                          {!entry.deletedAt && (
                            <input
                              type="checkbox"
                              checked={selectedEntries.has(entry.id)}
                              onChange={() => toggleEntry(entry.id)}
                              className="accent-[#4676ac]"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {entry.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#202020] dark:text-[#e5e5e5] line-through decoration-1" style={entry.deletedAt ? {} : { textDecoration: 'none' }}>
                          {entry.title}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#202020] dark:text-[#e5e5e5]">
                          <Link href={`/journal/${entry.author.username}`} className="text-[#4676ac] hover:underline">
                            {entry.author.username}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {entry.deletedAt ? (
                            <span className="text-xs font-bold px-2 py-1 bg-[#994040] text-white">DELETED</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-1 bg-[#4676ac] text-white">ACTIVE</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            {!entry.deletedAt && (
                              <>
                                <Link
                                  href={`/entry/${entry.id}`}
                                  className="p-2 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-colors"
                                  title="View Entry"
                                >
                                  <Eye size={14} strokeWidth={2.5} />
                                </Link>
                                <button
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="p-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors"
                                  title="Delete Entry"
                                >
                                  <Trash2 size={14} strokeWidth={2.5} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            <Pagination total={entriesTotal} offset={entriesOffset} setOffset={setEntriesOffset} loading={entriesLoading} />
          </div>
        )}

        {/* EXPEDITIONS VIEW */}
        {viewMode === 'expeditions' && (
          <div>
            {expeditionsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[#ac6d46]" size={24} />
              </div>
            ) : expeditions.length === 0 ? (
              <div className="text-center py-12 text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
                NO EXPEDITIONS FOUND
              </div>
            ) : (
              <>
                {selectedExpeditions.size > 0 && (
                  <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-[#4676ac] text-white border-2 border-[#202020]">
                    <span className="text-xs font-bold">{selectedExpeditions.size} SELECTED</span>
                    <button
                      onClick={handleBulkDeleteExpeditions}
                      disabled={bulkActionLoading}
                      className="px-3 py-1.5 bg-[#994040] text-white text-xs font-bold hover:bg-[#7a3333] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {bulkActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      DELETE
                    </button>
                    <button
                      onClick={() => setSelectedExpeditions(new Set())}
                      className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors"
                    >
                      CLEAR
                    </button>
                  </div>
                )}
                <div className="overflow-x-auto border-2 border-[#202020] dark:border-[#616161]">
                <table className="w-full bg-white dark:bg-[#2a2a2a]">
                  <thead>
                    <tr className="bg-[#202020] text-white">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={expeditions.filter(e => !e.deletedAt).length > 0 && expeditions.filter(e => !e.deletedAt).every(e => selectedExpeditions.has(e.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExpeditions(new Set(expeditions.filter(ex => !ex.deletedAt).map(ex => ex.id)));
                            } else {
                              setSelectedExpeditions(new Set());
                            }
                          }}
                          className="accent-[#4676ac]"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold">EXPEDITION ID</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">TITLE</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">EXPLORER</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">STATUS</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">CREATED</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">STATE</th>
                      <th className="text-center px-4 py-3 text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expeditions.map((expedition, index) => (
                      <tr
                        key={expedition.id}
                        className={`border-t-2 border-[#202020] dark:border-[#616161] ${
                          expedition.deletedAt
                            ? 'opacity-40'
                            : index % 2 === 0 ? 'bg-white dark:bg-[#2a2a2a]' : 'bg-[#f5f5f5] dark:bg-[#1a1a1a]'
                        }`}
                      >
                        <td className="px-4 py-3">
                          {!expedition.deletedAt && (
                            <input
                              type="checkbox"
                              checked={selectedExpeditions.has(expedition.id)}
                              onChange={() => toggleExpedition(expedition.id)}
                              className="accent-[#4676ac]"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {expedition.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#202020] dark:text-[#e5e5e5] line-through decoration-1" style={expedition.deletedAt ? {} : { textDecoration: 'none' }}>
                          {expedition.title}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#202020] dark:text-[#e5e5e5]">
                          <Link href={`/journal/${expedition.author.username}`} className="text-[#4676ac] hover:underline">
                            {expedition.author.username}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 ${
                            expedition.status === 'active'
                              ? 'bg-[#4676ac] text-white'
                              : expedition.status === 'completed'
                              ? 'bg-[#616161] text-white'
                              : 'bg-[#b5bcc4] text-[#202020] dark:bg-[#616161] dark:text-[#e5e5e5]'
                          }`}>
                            {(expedition.status || 'PLANNING').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {new Date(expedition.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {expedition.deletedAt ? (
                            <span className="text-xs font-bold px-2 py-1 bg-[#994040] text-white">DELETED</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-1 bg-[#598636] text-white">LIVE</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            {!expedition.deletedAt && (
                              <>
                                <Link
                                  href={`/expedition/${expedition.id}`}
                                  className="p-2 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-colors"
                                  title="View Expedition"
                                >
                                  <Eye size={14} strokeWidth={2.5} />
                                </Link>
                                <button
                                  onClick={() => handleDeleteExpedition(expedition.id)}
                                  className="p-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors"
                                  title="Delete Expedition"
                                >
                                  <Trash2 size={14} strokeWidth={2.5} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            <Pagination total={expeditionsTotal} offset={expeditionsOffset} setOffset={setExpeditionsOffset} loading={expeditionsLoading} />
          </div>
        )}

        {/* EXPLORERS VIEW */}
        {viewMode === 'explorers' && (
          <div>
            {explorersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-[#ac6d46]" size={24} />
              </div>
            ) : explorers.length === 0 ? (
              <div className="text-center py-12 text-sm text-[#616161] dark:text-[#b5bcc4] font-mono">
                NO EXPLORERS FOUND
              </div>
            ) : (
              <>
                {selectedExplorers.size > 0 && (
                  <div className="flex items-center gap-3 mb-3 px-4 py-3 bg-[#4676ac] text-white border-2 border-[#202020]">
                    <span className="text-xs font-bold">{selectedExplorers.size} SELECTED</span>
                    <button
                      onClick={handleBulkBlockExplorers}
                      disabled={bulkActionLoading}
                      className="px-3 py-1.5 bg-[#994040] text-white text-xs font-bold hover:bg-[#7a3333] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {bulkActionLoading ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />}
                      BLOCK
                    </button>
                    <button
                      onClick={() => setSelectedExplorers(new Set())}
                      className="px-3 py-1.5 bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors"
                    >
                      CLEAR
                    </button>
                  </div>
                )}
                <div className="overflow-x-auto border-2 border-[#202020] dark:border-[#616161]">
                <table className="w-full bg-white dark:bg-[#2a2a2a]">
                  <thead>
                    <tr className="bg-[#202020] text-white">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={explorers.filter(e => !e.blocked && !e.admin).length > 0 && explorers.filter(e => !e.blocked && !e.admin).every(e => selectedExplorers.has(e.username))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedExplorers(new Set(explorers.filter(ex => !ex.blocked && !ex.admin).map(ex => ex.username)));
                            } else {
                              setSelectedExplorers(new Set());
                            }
                          }}
                          className="accent-[#4676ac]"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold">USERNAME</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">EMAIL</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">ROLE</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">JOINED</th>
                      <th className="text-left px-4 py-3 text-xs font-bold">STATUS</th>
                      <th className="text-center px-4 py-3 text-xs font-bold">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {explorers.map((explorer, index) => (
                      <tr
                        key={explorer.username}
                        className={`border-t-2 border-[#202020] dark:border-[#616161] ${
                          explorer.blocked
                            ? 'opacity-40'
                            : index % 2 === 0 ? 'bg-white dark:bg-[#2a2a2a]' : 'bg-[#f5f5f5] dark:bg-[#1a1a1a]'
                        }`}
                      >
                        <td className="px-4 py-3">
                          {!explorer.blocked && !explorer.admin && (
                            <input
                              type="checkbox"
                              checked={selectedExplorers.has(explorer.username)}
                              onChange={() => toggleExplorer(explorer.username)}
                              className="accent-[#4676ac]"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
                          <Link href={`/journal/${explorer.username}`} className="text-[#4676ac] hover:underline">
                            {explorer.username}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {explorer.email}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 ${
                            explorer.admin
                              ? 'bg-[#ac6d46] text-white'
                              : explorer.isGuide
                              ? 'bg-[#598636] text-white'
                              : explorer.role === 'creator'
                              ? 'bg-[#4676ac] text-white'
                              : 'bg-[#b5bcc4] text-[#202020] dark:bg-[#616161] dark:text-[#e5e5e5]'
                          }`}>
                            {explorer.admin ? 'ADMIN' : explorer.isGuide ? 'EXPEDITION GUIDE' : explorer.role === 'creator' ? 'EXPLORER PRO' : explorer.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {new Date(explorer.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {explorer.blocked ? (
                            <span className="text-xs font-bold px-2 py-1 bg-[#994040] text-white">BLOCKED</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-1 bg-[#598636] text-white">ACTIVE</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <Link
                              href={`/journal/${explorer.username}`}
                              className="p-2 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-colors"
                              title="View Profile"
                            >
                              <Eye size={14} strokeWidth={2.5} />
                            </Link>
                            {explorer.blocked ? (
                              <button
                                onClick={() => handleUnblockExplorer(explorer.username)}
                                className="p-2 bg-[#598636] text-white hover:bg-[#4a6d2b] transition-colors"
                                title="Unblock Explorer"
                              >
                                <UserCheck size={14} strokeWidth={2.5} />
                              </button>
                            ) : (
                              !explorer.admin && (
                                <button
                                  onClick={() => handleBlockExplorer(explorer.username)}
                                  className="p-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors"
                                  title="Block Explorer"
                                >
                                  <UserX size={14} strokeWidth={2.5} />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            <Pagination total={explorersTotal} offset={explorersOffset} setOffset={setExplorersOffset} loading={explorersLoading} />
          </div>
        )}

        {/* INVITE CODES VIEW */}
        {viewMode === 'inviteCodes' && (
          <div>
            {/* Generate Codes Form */}
            <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4 mb-6">
              <h3 className="text-sm font-bold mb-3 text-[#202020] dark:text-[#e5e5e5]">GENERATE INVITE CODES</h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium mb-1 text-[#616161] dark:text-[#b5bcc4]">LABEL (OPTIONAL)</label>
                  <input
                    type="text"
                    value={newCodeLabel}
                    onChange={(e) => setNewCodeLabel(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#4676ac] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                    placeholder="e.g. Guide batch - April 2026"
                    maxLength={100}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium mb-1 text-[#616161] dark:text-[#b5bcc4]">COUNT</label>
                  <input
                    type="number"
                    value={newCodeCount}
                    onChange={(e) => setNewCodeCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#4676ac] outline-none text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-[#e5e5e5]"
                    min={1}
                    max={50}
                  />
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await adminApi.createInviteCodes({
                        label: newCodeLabel || undefined,
                        count: newCodeCount,
                      });
                      setGeneratedCodes(res.codes);
                      setNewCodeLabel('');
                      setNewCodeCount(1);
                      loadInviteCodes();
                    } catch (e) {
                      console.error('Failed to create invite codes', e);
                    }
                  }}
                  className="px-4 py-2 bg-[#4676ac] text-white text-xs font-bold hover:bg-[#365a8a] transition-colors"
                >
                  GENERATE
                </button>
              </div>

              {/* Show generated codes */}
              {generatedCodes.length > 0 && (
                <div className="mt-4 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a]">
                  <div className="text-xs font-bold mb-2 text-[#598636]">GENERATED {generatedCodes.length} CODE(S):</div>
                  <div className="space-y-1">
                    {generatedCodes.map((code) => (
                      <div key={code} className="flex items-center gap-2">
                        <code className="text-sm font-mono text-[#202020] dark:text-[#e5e5e5]">{code}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            setCopiedCode(code);
                            setTimeout(() => setCopiedCode(null), 2000);
                          }}
                          className="p-1 text-[#616161] hover:text-[#4676ac] transition-colors"
                          title="Copy code"
                        >
                          {copiedCode === code ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Codes Table */}
            {inviteCodesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-[#ac6d46]" size={24} />
              </div>
            ) : inviteCodes.length === 0 ? (
              <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-8 text-center">
                <Key size={32} className="mx-auto mb-3 text-[#b5bcc4]" strokeWidth={1.5} />
                <div className="text-sm font-bold text-[#616161] dark:text-[#b5bcc4]">
                  NO INVITE CODES FOUND
                </div>
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">Generate codes above to invite guides</div>
              </div>
            ) : (
              <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a]">
                      <th className="px-4 py-3 text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">CODE</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">LABEL</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">STATUS</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">CREATED BY</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">USED BY</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">CREATED</th>
                      <th className="px-4 py-3 text-xs font-bold text-[#202020] dark:text-[#e5e5e5] text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inviteCodes.map((code) => (
                      <tr key={code.id} className="border-b border-[#b5bcc4] dark:border-[#3a3a3a] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]">
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-[#202020] dark:text-[#e5e5e5]">{code.code}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#616161] dark:text-[#b5bcc4]">
                          {code.label || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 ${
                            code.status === 'available'
                              ? 'bg-[#598636] text-white'
                              : code.status === 'used'
                              ? 'bg-[#b5bcc4] text-[#202020] dark:bg-[#616161] dark:text-[#e5e5e5]'
                              : 'bg-[#994040] text-white'
                          }`}>
                            {code.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {code.createdBy}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {code.usedBy || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {new Date(code.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {code.status === 'available' && (
                            <button
                              onClick={() => showConfirm(
                                `Revoke invite code ${code.code}?`,
                                async () => {
                                  try {
                                    await adminApi.revokeInviteCode(code.id);
                                    loadInviteCodes();
                                  } catch (e) {
                                    console.error('Failed to revoke invite code', e);
                                  }
                                },
                              )}
                              className="p-2 bg-[#994040] text-white hover:bg-[#7a3333] transition-colors"
                              title="Revoke Code"
                            >
                              <Trash2 size={14} strokeWidth={2.5} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination total={inviteCodesTotal} offset={inviteCodesOffset} setOffset={setInviteCodesOffset} loading={inviteCodesLoading} />
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} className="text-[#ac6d46] shrink-0" />
              <h3 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">CONFIRM ACTION</h3>
            </div>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] text-xs font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 bg-[#994040] text-white text-xs font-bold hover:bg-[#7a3333] transition-colors"
              >
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
