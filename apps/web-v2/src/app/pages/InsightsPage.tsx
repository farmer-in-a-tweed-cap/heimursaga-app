'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  FileText,
  MessageCircle,
  Bookmark,
  Map,
  ExternalLink,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Heart,
  Eye,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { ProRoute } from '@/app/components/ProRoute';
import { SettingsLayout } from '@/app/components/SettingsLayout';
import { useAuth } from '@/app/context/AuthContext';
import {
  insightsApi,
  explorerApi,
  PostInsight,
  BalanceResponse,
  Expedition,
  SponsorshipsResponse,
} from '@/app/services/api';

// Types for dashboard data
interface DashboardData {
  followers: number;
  following: number;
  entries: number;
  activeSponsors: number;
  balance: BalanceResponse | null;
  entryInsights: PostInsight[];
  expeditions: Expedition[];
  sponsorships: SponsorshipsResponse | null;
}

// Stat card component
function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  valueColor = 'text-[#ac6d46]',
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  valueColor?: string;
}) {
  return (
    <div className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 text-center bg-white dark:bg-[#202020]">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#616161] dark:text-[#b5bcc4]" />
        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] uppercase">{label}</div>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
      {trend && (
        <div className="flex items-center justify-center gap-1 mt-1 text-xs">
          {trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-600" />}
          {trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-600" />}
          {trend === 'stable' && <Minus className="w-3 h-3 text-[#616161]" />}
        </div>
      )}
    </div>
  );
}

// Section card component
function SectionCard({
  title,
  icon: Icon,
  children,
  headerColor = 'bg-[#ac6d46]',
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  headerColor?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
      <div className={`${headerColor} text-white px-4 py-3 font-bold text-sm flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <div className="p-4 lg:p-6">{children}</div>
    </div>
  );
}

// Entry performance row
function EntryRow({
  entry,
  rank,
}: {
  entry: PostInsight;
  rank: number;
}) {
  const createdDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#b5bcc4] dark:border-[#3a3a3a] last:border-0">
      <div className="w-6 h-6 flex items-center justify-center bg-[#f5f5f5] dark:bg-[#2a2a2a] text-xs font-bold text-[#616161] dark:text-[#b5bcc4]">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={`/entry/${entry.id}`}
          className="font-bold text-sm dark:text-[#e5e5e5] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] truncate block"
        >
          {entry.title}
        </Link>
        <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">{createdDate}</div>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1" title="Views">
          <Eye className="w-3 h-3 text-[#616161]" />
          <span className="dark:text-[#e5e5e5]">{entry.viewsCount}</span>
        </div>
        <div className="flex items-center gap-1" title="Bookmarks">
          <Bookmark className="w-3 h-3 text-[#4676ac]" />
          <span className="dark:text-[#e5e5e5]">{entry.bookmarksCount}</span>
        </div>
        <div className="flex items-center gap-1" title="Notes">
          <MessageCircle className="w-3 h-3 text-[#ac6d46]" />
          <span className="dark:text-[#e5e5e5]">{entry.commentsCount}</span>
        </div>
      </div>
    </div>
  );
}

// Expedition card
function ExpeditionCard({ expedition }: { expedition: Expedition }) {
  const statusColors: Record<string, string> = {
    planning: 'bg-[#616161]',
    active: 'bg-[#4676ac]',
    completed: 'bg-[#ac6d46]',
  };

  const statusColor = statusColors[expedition.status?.toLowerCase() || 'planning'] || 'bg-[#616161]';
  const fundingProgress = expedition.goal && expedition.goal > 0
    ? Math.min(100, ((expedition.raised || 0) / expedition.goal) * 100)
    : 0;

  return (
    <div className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/expedition/${expedition.publicId || expedition.id}`}
          className="font-bold text-sm dark:text-[#e5e5e5] hover:text-[#ac6d46] dark:hover:text-[#ac6d46]"
        >
          {expedition.title}
        </Link>
        <span className={`${statusColor} text-white text-xs px-2 py-0.5 font-bold uppercase`}>
          {expedition.status || 'Planning'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div>
          <div className="text-[#616161] dark:text-[#b5bcc4]">Entries</div>
          <div className="font-bold dark:text-[#e5e5e5]">{expedition.entriesCount || 0}</div>
        </div>
        <div>
          <div className="text-[#616161] dark:text-[#b5bcc4]">Sponsors</div>
          <div className="font-bold dark:text-[#e5e5e5]">{expedition.sponsorsCount || 0}</div>
        </div>
        <div>
          <div className="text-[#616161] dark:text-[#b5bcc4]">Raised</div>
          <div className="font-bold text-[#ac6d46]">${expedition.raised || 0}</div>
        </div>
      </div>
      {expedition.goal && expedition.goal > 0 && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#616161] dark:text-[#b5bcc4]">Funding Progress</span>
            <span className="dark:text-[#e5e5e5]">{fundingProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-[#f5f5f5] dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#3a3a3a]">
            <div
              className="h-full bg-[#ac6d46] transition-all"
              style={{ width: `${fundingProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-2 border-[#b5bcc4] dark:border-[#616161] p-4 h-24 bg-[#f5f5f5] dark:bg-[#2a2a2a]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-80 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161]" />
          <div className="h-64 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161]" />
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161]" />
          <div className="h-48 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-2 border-[#b5bcc4] dark:border-[#616161]" />
        </div>
      </div>
    </div>
  );
}

export function InsightsPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({
    followers: 0,
    following: 0,
    entries: 0,
    activeSponsors: 0,
    balance: null,
    entryInsights: [],
    expeditions: [],
    sponsorships: null,
  });

  // Fetch all dashboard data
  useEffect(() => {
    if (!user?.username) return;

    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel
        const [
          ,
          insightsResponse,
          balanceResponse,
          expeditionsResponse,
          sponsorshipsResponse,
          followersResponse,
          followingResponse,
        ] = await Promise.allSettled([
          explorerApi.getByUsername(user!.username),
          insightsApi.getPostInsights(),
          insightsApi.getBalance(),
          explorerApi.getMyExpeditions(),
          insightsApi.getSponsorships(),
          explorerApi.getFollowers(user!.username),
          explorerApi.getFollowing(user!.username),
        ]);

        if (cancelled) return;

        // Extract data safely
        const entries = insightsResponse.status === 'fulfilled' ? insightsResponse.value.posts : [];
        const balance = balanceResponse.status === 'fulfilled' ? balanceResponse.value : null;
        const expeditions = expeditionsResponse.status === 'fulfilled' ? expeditionsResponse.value.data : [];
        const sponsorships = sponsorshipsResponse.status === 'fulfilled' ? sponsorshipsResponse.value : null;
        const followers = followersResponse.status === 'fulfilled' ? followersResponse.value.results : 0;
        const following = followingResponse.status === 'fulfilled' ? followingResponse.value.results : 0;

        // Count active sponsors
        const activeSponsors = sponsorships?.data?.filter(s => s.status === 'active').length || 0;

        setData({
          followers,
          following,
          entries: entries.length,
          activeSponsors,
          balance,
          entryInsights: entries,
          expeditions,
          sponsorships,
        });
      } catch {
        if (!cancelled) {
          setError('Failed to load insights data. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data.entryInsights.length) return [];

    // Sort by date and take last 15 entries
    const sorted = [...data.entryInsights]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-15);

    return sorted.map((entry) => ({
      name: new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bookmarks: entry.bookmarksCount,
      notes: entry.commentsCount,
      views: entry.viewsCount,
      title: entry.title,
    }));
  }, [data.entryInsights]);

  // Top entries by engagement
  const topEntries = useMemo(() => {
    return [...data.entryInsights]
      .sort((a, b) => (b.bookmarksCount + b.commentsCount) - (a.bookmarksCount + a.commentsCount))
      .slice(0, 5);
  }, [data.entryInsights]);

  // Top entries for bar chart
  const barChartData = useMemo(() => {
    return topEntries.slice(0, 5).map((entry) => ({
      name: entry.title.length > 20 ? entry.title.slice(0, 20) + '...' : entry.title,
      engagement: entry.bookmarksCount + entry.commentsCount,
      bookmarks: entry.bookmarksCount,
      notes: entry.commentsCount,
      views: entry.viewsCount,
    }));
  }, [topEntries]);

  // Calculate engagement stats
  const engagementStats = useMemo(() => {
    if (!data.entryInsights.length) return { avgBookmarks: 0, avgNotes: 0, totalEngagement: 0, totalViews: 0, uniqueViewers: 0 };

    const totalBookmarks = data.entryInsights.reduce((sum, e) => sum + e.bookmarksCount, 0);
    const totalNotes = data.entryInsights.reduce((sum, e) => sum + e.commentsCount, 0);
    const totalViews = data.entryInsights.reduce((sum, e) => sum + e.viewsCount, 0);
    const uniqueViewers = data.entryInsights.reduce((sum, e) => sum + e.uniqueViewersCount, 0);

    return {
      avgBookmarks: Math.round(totalBookmarks / data.entryInsights.length * 10) / 10,
      avgNotes: Math.round(totalNotes / data.entryInsights.length * 10) / 10,
      totalEngagement: totalBookmarks + totalNotes,
      totalViews,
      uniqueViewers,
    };
  }, [data.entryInsights]);

  // Format balance
  const formattedBalance = useMemo(() => {
    if (!data.balance?.available) return '$0.00';
    const { amount, symbol } = data.balance.available;
    return `${symbol}${amount.toFixed(2)}`;
  }, [data.balance]);

  return (
    <ProRoute
      pageName="Insights & Analytics Dashboard"
      pageDescription="Access comprehensive analytics and insights about your journal's performance, audience demographics, engagement patterns, and sponsorship trends."
    >

      <SettingsLayout>
        <div className="max-w-[1600px] mx-auto py-12">
          {/* Page Header */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
            <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-[#ac6d46]" />
                <h1 className="text-2xl font-bold dark:text-[#e5e5e5]">INSIGHTS & ANALYTICS</h1>
              </div>
              <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">ALL TIME</span>
            </div>
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">
              Track your journal's performance, audience engagement, and sponsorship metrics.
            </p>
          </div>

          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="bg-white dark:bg-[#202020] border-2 border-red-500 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#ac6d46] text-white font-bold text-sm hover:bg-[#8a5738] transition-all"
              >
                RETRY
              </button>
            </div>
          ) : (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <StatCard
                  label="Total Views"
                  value={engagementStats.totalViews}
                  icon={Eye}
                  valueColor="dark:text-[#e5e5e5]"
                />
                <StatCard
                  label="Total Followers"
                  value={data.followers}
                  icon={Users}
                  valueColor="dark:text-[#e5e5e5]"
                />
                <StatCard
                  label="Total Entries"
                  value={data.entries}
                  icon={FileText}
                  valueColor="dark:text-[#e5e5e5]"
                />
                <StatCard
                  label="Active Sponsors"
                  value={data.activeSponsors}
                  icon={Heart}
                  valueColor="text-[#4676ac]"
                />
                <StatCard
                  label="Available Balance"
                  value={formattedBalance}
                  icon={DollarSign}
                  valueColor="text-[#ac6d46]"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Engagement Over Time Chart */}
                  <SectionCard title="ENGAGEMENT OVER TIME" icon={BarChart3}>
                    {chartData.length > 0 ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#b5bcc4" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 11, fill: '#616161' }}
                              tickLine={{ stroke: '#b5bcc4' }}
                            />
                            <YAxis
                              tick={{ fontSize: 11, fill: '#616161' }}
                              tickLine={{ stroke: '#b5bcc4' }}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#202020',
                                border: '2px solid #616161',
                                borderRadius: 0,
                                fontSize: 12,
                              }}
                              labelStyle={{ color: '#e5e5e5', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line
                              type="monotone"
                              dataKey="bookmarks"
                              stroke="#4676ac"
                              strokeWidth={2}
                              dot={{ fill: '#4676ac', r: 4 }}
                              name="Bookmarks"
                            />
                            <Line
                              type="monotone"
                              dataKey="notes"
                              stroke="#ac6d46"
                              strokeWidth={2}
                              dot={{ fill: '#ac6d46', r: 4 }}
                              name="Notes"
                            />
                            <Line
                              type="monotone"
                              dataKey="views"
                              stroke="#616161"
                              strokeWidth={2}
                              dot={{ fill: '#616161', r: 4 }}
                              name="Views"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-72 flex items-center justify-center text-[#616161] dark:text-[#b5bcc4]">
                        <div className="text-center">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No entry data available yet.</p>
                          <Link
                            href="/write"
                            className="text-[#ac6d46] hover:underline text-sm mt-2 inline-block"
                          >
                            Write your first entry →
                          </Link>
                        </div>
                      </div>
                    )}
                  </SectionCard>

                  {/* Top Performing Entries */}
                  <SectionCard title="TOP PERFORMING ENTRIES" icon={TrendingUp}>
                    {topEntries.length > 0 ? (
                      <>
                        <div className="mb-4">
                          {topEntries.map((entry, index) => (
                            <EntryRow key={entry.id} entry={entry} rank={index + 1} />
                          ))}
                        </div>
                        {data.entryInsights.length > 5 && (
                          <Link
                            href={`/@${user?.username}`}
                            className="text-xs font-bold text-[#4676ac] hover:underline flex items-center gap-1"
                          >
                            VIEW ALL ENTRIES <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </>
                    ) : (
                      <div className="py-8 text-center text-[#616161] dark:text-[#b5bcc4]">
                        <p className="text-sm">No entries yet. Start writing to see your top performers!</p>
                      </div>
                    )}
                  </SectionCard>

                  {/* Top Entries Bar Chart */}
                  {barChartData.length > 0 && (
                    <SectionCard title="ENTRY PERFORMANCE COMPARISON" icon={BarChart3}>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#b5bcc4" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#616161' }} />
                            <YAxis
                              dataKey="name"
                              type="category"
                              tick={{ fontSize: 10, fill: '#616161' }}
                              width={120}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#202020',
                                border: '2px solid #616161',
                                borderRadius: 0,
                                fontSize: 12,
                              }}
                              labelStyle={{ color: '#e5e5e5', fontWeight: 'bold' }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="views" fill="#616161" name="Views" />
                            <Bar dataKey="bookmarks" fill="#4676ac" name="Bookmarks" />
                            <Bar dataKey="notes" fill="#ac6d46" name="Notes" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </SectionCard>
                  )}

                  {/* Expedition Performance */}
                  <SectionCard title="EXPEDITION PERFORMANCE" icon={Map}>
                    {data.expeditions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.expeditions.slice(0, 4).map((expedition) => (
                          <ExpeditionCard key={expedition.publicId || expedition.id} expedition={expedition} />
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-[#616161] dark:text-[#b5bcc4]">
                        <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No expeditions yet.</p>
                        <Link
                          href="/expeditions/new"
                          className="text-[#ac6d46] hover:underline text-sm mt-2 inline-block"
                        >
                          Plan your first expedition →
                        </Link>
                      </div>
                    )}
                    {data.expeditions.length > 4 && (
                      <div className="mt-4 pt-4 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                        <Link
                          href="/settings/expeditions"
                          className="text-xs font-bold text-[#4676ac] hover:underline flex items-center gap-1"
                        >
                          MANAGE ALL EXPEDITIONS <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Engagement Summary */}
                  <SectionCard title="ENGAGEMENT SUMMARY" icon={TrendingUp}>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">Total Views</span>
                        <span className="font-bold text-lg dark:text-[#e5e5e5]">{engagementStats.totalViews}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">Unique Viewers</span>
                        <span className="font-bold text-lg dark:text-[#e5e5e5]">{engagementStats.uniqueViewers}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-[#b5bcc4] dark:border-[#3a3a3a]">
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">Total Engagement</span>
                        <span className="font-bold text-lg dark:text-[#e5e5e5]">{engagementStats.totalEngagement}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">Avg. Bookmarks per Entry</span>
                        <span className="font-bold dark:text-[#e5e5e5]">{engagementStats.avgBookmarks}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">Avg. Notes per Entry</span>
                        <span className="font-bold dark:text-[#e5e5e5]">{engagementStats.avgNotes}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-[#b5bcc4] dark:border-[#3a3a3a]">
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">Following</span>
                        <span className="font-bold dark:text-[#e5e5e5]">{data.following}</span>
                      </div>
                    </div>
                  </SectionCard>

                  {/* Sponsorship Overview */}
                  <SectionCard title="SPONSORSHIP OVERVIEW" icon={DollarSign}>
                    <div className="space-y-4">
                      <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 border border-[#b5bcc4] dark:border-[#3a3a3a]">
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-1">Available Balance</div>
                        <div className="text-2xl font-bold text-[#ac6d46]">{formattedBalance}</div>
                        {data.balance?.pending && data.balance.pending.amount > 0 && (
                          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                            + {data.balance.pending.symbol}{data.balance.pending.amount.toFixed(2)} pending
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">Active Sponsors</span>
                        <span className="font-bold dark:text-[#e5e5e5]">{data.activeSponsors}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">Total Sponsorships</span>
                        <span className="font-bold dark:text-[#e5e5e5]">{data.sponsorships?.results || 0}</span>
                      </div>
                      <Link
                        href="/settings/billing"
                        className="block w-full px-4 py-2 bg-[#202020] dark:bg-[#4676ac] text-white text-xs font-bold text-center hover:bg-[#4676ac] dark:hover:bg-[#365a87] transition-all"
                      >
                        MANAGE PAYOUTS
                      </Link>
                    </div>
                  </SectionCard>

                  {/* Quick Actions */}
                  <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
                    <div className="p-4">
                      <div className="text-xs font-bold mb-3 dark:text-[#e5e5e5]">QUICK ACTIONS</div>
                      <div className="space-y-2">
                        <Link
                          href="/write"
                          className="flex items-center gap-2 text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] transition-colors py-1"
                        >
                          <FileText className="w-4 h-4" />
                          Write New Entry
                        </Link>
                        <Link
                          href={`/@${user?.username}`}
                          className="flex items-center gap-2 text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] transition-colors py-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Public Profile
                        </Link>
                        <Link
                          href="/settings/expeditions"
                          className="flex items-center gap-2 text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] transition-colors py-1"
                        >
                          <Map className="w-4 h-4" />
                          Manage Expeditions
                        </Link>
                        <Link
                          href="/settings/billing"
                          className="flex items-center gap-2 text-xs text-[#616161] dark:text-[#b5bcc4] hover:text-[#ac6d46] dark:hover:text-[#ac6d46] transition-colors py-1"
                        >
                          <DollarSign className="w-4 h-4" />
                          Payout Settings
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Help Card */}
                  <div className="bg-white dark:bg-[#202020] border-2 border-[#b5bcc4] dark:border-[#616161]">
                    <div className="p-4">
                      <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">INSIGHTS HELP</div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2 leading-relaxed">
                        <div>• Engagement = Bookmarks + Notes</div>
                        <div>• Views = Total entry impressions</div>
                        <div>• Balance updates after Stripe processing</div>
                        <div>• Charts show last 15 entries</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SettingsLayout>
    </ProRoute>
  );
}
