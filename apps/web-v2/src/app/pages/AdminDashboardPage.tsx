'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  FileText,
  Filter,
  Flag,
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
  AdminStats,
} from '@/app/services/api';

type ViewMode = 'flags' | 'entries' | 'expeditions' | 'explorers';

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

  // Auth guard — only explorer1 can access
  const isAdmin = !!user && user.username === 'explorer1';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, authLoading, router]);

  // Load stats
  useEffect(() => {
    if (!isAdmin) return;
    adminApi.getStats().then(setStats).catch(console.error);
  }, [user]);

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
  }, [viewMode, user, loadFlags]);

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
  }, [viewMode, user, loadEntries]);

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
  }, [viewMode, user, loadExpeditions]);

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
  }, [viewMode, user, loadExplorers]);

  // Reset offset when search changes
  useEffect(() => {
    setEntriesOffset(0);
    setExpeditionsOffset(0);
    setExplorersOffset(0);
  }, [debouncedSearch]);

  // Actions
  const handleReviewFlag = async (flagId: string, action: 'approve' | 'dismiss') => {
    if (!confirm(`Are you sure you want to ${action === 'approve' ? 'approve and take action on' : 'dismiss'} this flag?`)) return;
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
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry? This action soft-deletes the entry.')) return;
    try {
      await adminApi.deleteEntry(id);
      loadEntries();
      adminApi.getStats().then(setStats).catch(console.error);
    } catch (e) {
      console.error('Failed to delete entry', e);
    }
  };

  const handleDeleteExpedition = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expedition? This action soft-deletes the expedition.')) return;
    try {
      await adminApi.deleteExpedition(id);
      loadExpeditions();
      adminApi.getStats().then(setStats).catch(console.error);
    } catch (e) {
      console.error('Failed to delete expedition', e);
    }
  };

  const handleBlockExplorer = async (username: string) => {
    if (!confirm(`Are you sure you want to block ${username}? This will also soft-delete their entries and expeditions.`)) return;
    try {
      await adminApi.blockExplorer(username);
      loadExplorers();
      adminApi.getStats().then(setStats).catch(console.error);
    } catch (e) {
      console.error('Failed to block explorer', e);
    }
  };

  const handleUnblockExplorer = async (username: string) => {
    if (!confirm(`Are you sure you want to unblock ${username}?`)) return;
    try {
      await adminApi.unblockExplorer(username);
      loadExplorers();
      adminApi.getStats().then(setStats).catch(console.error);
    } catch (e) {
      console.error('Failed to unblock explorer', e);
    }
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
            className="p-2 border-2 border-[#202020] dark:border-[#616161] disabled:opacity-30 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <span className="px-3 py-2 text-xs font-bold text-[#202020] dark:text-[#e5e5e5]">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total || loading}
            className="p-2 border-2 border-[#202020] dark:border-[#616161] disabled:opacity-30 hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-colors"
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
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#1a1a1a]">
      {/* Header */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#202020] text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-6">
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
      </div>

      {/* Navigation Tabs */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a]">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex gap-1">
            {([
              { key: 'flags' as const, icon: Flag, label: 'FLAGS & REPORTS', badge: pendingFlagsCount },
              { key: 'entries' as const, icon: FileText, label: 'ENTRIES' },
              { key: 'expeditions' as const, icon: Map, label: 'EXPEDITIONS' },
              { key: 'explorers' as const, icon: Users, label: 'EXPLORERS' },
            ]).map(({ key, icon: Icon, label, badge }) => (
              <button
                key={key}
                onClick={() => { setViewMode(key); setSearchQuery(''); }}
                className={`px-6 py-3 text-sm font-bold transition-colors relative ${
                  viewMode === key
                    ? 'bg-white dark:bg-[#202020] text-[#ac6d46] border-t-4 border-[#ac6d46]'
                    : 'bg-transparent text-[#616161] hover:bg-[#e5e5e5] dark:hover:bg-[#3a3a3a]'
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
      </div>

      {/* Search and Filters */}
      <div className="border-b-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#202020]">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
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
      </div>

      {/* Content Area */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
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
                <div className="text-3xl font-bold text-[#ac6d46]">{stats?.pendingFlags ?? 0}</div>
              </div>
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 bg-white dark:bg-[#2a2a2a]">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-bold">TOTAL ENTRIES</div>
                <div className="text-3xl font-bold text-[#4676ac]">{stats?.entries ?? 0}</div>
              </div>
              <div className="border-2 border-[#202020] dark:border-[#616161] p-4 bg-white dark:bg-[#2a2a2a]">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1 font-bold">BLOCKED EXPLORERS</div>
                <div className="text-3xl font-bold text-[#616161]">{stats?.blockedExplorers ?? 0}</div>
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
                {flags.map((flag) => (
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
                              {flag.flaggedContent.type.toUpperCase()} • {flag.flaggedContent.preview}
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
                              href={`/${flag.flaggedContent.type === 'post' ? 'entry' : 'entry'}/${flag.flaggedContent.id}`}
                              className="px-4 py-2 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-colors text-xs font-bold flex items-center gap-2"
                            >
                              <Eye size={14} strokeWidth={2.5} />
                              VIEW CONTENT
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
              <div className="overflow-x-auto border-2 border-[#202020] dark:border-[#616161]">
                <table className="w-full bg-white dark:bg-[#2a2a2a]">
                  <thead>
                    <tr className="bg-[#202020] text-white">
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
                          index % 2 === 0 ? 'bg-white dark:bg-[#2a2a2a]' : 'bg-[#f5f5f5] dark:bg-[#1a1a1a]'
                        }`}
                      >
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {entry.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
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
                            <span className="text-xs font-bold px-2 py-1 bg-red-600 text-white">DELETED</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-1 bg-[#4676ac] text-white">ACTIVE</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <Link
                              href={`/entry/${entry.id}`}
                              className="p-2 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-colors"
                              title="View Entry"
                            >
                              <Eye size={14} strokeWidth={2.5} />
                            </Link>
                            {!entry.deletedAt && (
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="p-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors"
                                title="Delete Entry"
                              >
                                <Trash2 size={14} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="overflow-x-auto border-2 border-[#202020] dark:border-[#616161]">
                <table className="w-full bg-white dark:bg-[#2a2a2a]">
                  <thead>
                    <tr className="bg-[#202020] text-white">
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
                          index % 2 === 0 ? 'bg-white dark:bg-[#2a2a2a]' : 'bg-[#f5f5f5] dark:bg-[#1a1a1a]'
                        }`}
                      >
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {expedition.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
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
                              : 'bg-[#b5bcc4] text-[#202020]'
                          }`}>
                            {(expedition.status || 'PLANNING').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {new Date(expedition.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {expedition.deletedAt ? (
                            <span className="text-xs font-bold px-2 py-1 bg-red-600 text-white">DELETED</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-1 bg-green-600 text-white">LIVE</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 justify-center">
                            <Link
                              href={`/expedition/${expedition.id}`}
                              className="p-2 bg-[#4676ac] text-white hover:bg-[#365a8a] transition-colors"
                              title="View Expedition"
                            >
                              <Eye size={14} strokeWidth={2.5} />
                            </Link>
                            {!expedition.deletedAt && (
                              <button
                                onClick={() => handleDeleteExpedition(expedition.id)}
                                className="p-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-colors"
                                title="Delete Expedition"
                              >
                                <Trash2 size={14} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="overflow-x-auto border-2 border-[#202020] dark:border-[#616161]">
                <table className="w-full bg-white dark:bg-[#2a2a2a]">
                  <thead>
                    <tr className="bg-[#202020] text-white">
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
                          index % 2 === 0 ? 'bg-white dark:bg-[#2a2a2a]' : 'bg-[#f5f5f5] dark:bg-[#1a1a1a]'
                        }`}
                      >
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
                            explorer.role === 'admin'
                              ? 'bg-[#ac6d46] text-white'
                              : explorer.role === 'creator'
                              ? 'bg-[#4676ac] text-white'
                              : 'bg-[#b5bcc4] text-[#202020]'
                          }`}>
                            {explorer.role === 'creator' ? 'EXPLORER PRO' : explorer.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-[#616161] dark:text-[#b5bcc4]">
                          {new Date(explorer.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {explorer.blocked ? (
                            <span className="text-xs font-bold px-2 py-1 bg-red-600 text-white">BLOCKED</span>
                          ) : (
                            <span className="text-xs font-bold px-2 py-1 bg-green-600 text-white">ACTIVE</span>
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
                                className="p-2 bg-green-600 text-white hover:bg-green-700 transition-colors"
                                title="Unblock Explorer"
                              >
                                <UserCheck size={14} strokeWidth={2.5} />
                              </button>
                            ) : (
                              explorer.role !== 'admin' && (
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
            )}

            <Pagination total={explorersTotal} offset={explorersOffset} setOffset={setExplorersOffset} loading={explorersLoading} />
          </div>
        )}
      </div>
    </div>
  );
}
