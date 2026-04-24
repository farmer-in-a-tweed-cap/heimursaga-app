'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/app/context/AuthContext';
import { useProFeatures } from '@/app/hooks/useProFeatures';
import { Map, Zap, Lock, FileText, Archive, Loader2, AlertTriangle, Compass, Rocket } from 'lucide-react';
import { useState, useEffect } from 'react';
import { explorerApi, expeditionApi, type ExplorerExpedition } from '@/app/services/api';
import { formatDate, formatDateTime } from '@/app/utils/dateFormat';

export function SelectExpeditionPage() {
  const { isAuthenticated } = useAuth();
  const { isPro } = useProFeatures();
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<'current' | 'completed' | 'blueprints'>('current');

  // Mobile detection — expedition builder requires desktop
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // API state
  const [expeditions, setExpeditions] = useState<ExplorerExpedition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's expeditions
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchExpeditions = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use the new endpoint that returns all user's expeditions without filters
        const result = await explorerApi.getMyExpeditions();
        setExpeditions(result.data || []);
      } catch {
        setError('Failed to load your expeditions');
      } finally {
        setLoading(false);
      }
    };

    fetchExpeditions();
  }, [isAuthenticated]);

  // Filter expeditions by status. Blueprints are handled separately — they
  // aren't "planned" expeditions in the journal sense, they're templates the
  // guide can launch into a new standard expedition. Treat expeditions without
  // a status or with 'active'/'planned' status as active.
  const standardExpeditions = expeditions.filter(e => !e.isBlueprint);
  const activeExpeditions = standardExpeditions.filter(e => !e.status || e.status === 'active' || e.status === 'planned');
  const completedExpeditions = standardExpeditions.filter(e => e.status === 'completed');
  const draftExpeditions = standardExpeditions.filter(e => e.status === 'draft');
  const currentExpedition = activeExpeditions[0] || null;
  // Published blueprints the user can launch. Draft blueprints continue to
  // appear in the general drafts section with a "continue in builder" action,
  // since they're not yet adoptable.
  const publishedBlueprints = expeditions.filter(e => e.isBlueprint && e.status === 'published');

  // Launch the adopt-blueprint flow. Same call as external adopters, but
  // because the guide owns the source, the backend leaves the derived
  // expedition route-unlocked. Block when the guide already has an
  // active/planned expedition — same rule the rest of the app enforces.
  const [launchingBlueprintId, setLaunchingBlueprintId] = useState<string | null>(null);
  const handleLaunchBlueprint = async (blueprintId: string) => {
    if (launchingBlueprintId) return;
    if (currentExpedition) {
      toast.error(
        'Finish or archive your current expedition before launching a new one',
      );
      return;
    }
    setLaunchingBlueprintId(blueprintId);
    try {
      const res = await expeditionApi.adopt(blueprintId);
      router.push(`/expedition-quick-entry/${res.expeditionId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to launch blueprint';
      toast.error(msg);
    } finally {
      setLaunchingBlueprintId(null);
    }
  };
  
  // Authentication gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161]">
          <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] text-white">
            <div className="flex items-center gap-3">
              <Lock size={24} strokeWidth={2} />
              <h2 className="text-lg font-bold">AUTHENTICATION REQUIRED</h2>
            </div>
          </div>
          <div className="p-8 text-center">
            <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-6">
              You must be logged in to select an expedition. Please log in to continue.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/auth?redirect=' + pathname)}
                className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
              >
                LOG IN / REGISTER
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] font-bold hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
              >
                GO TO HOMEPAGE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate days active for an expedition
  const calculateDaysActive = (startDate?: string): number => {
    if (!startDate) return 0;
    const start = new Date(startDate);
    const now = new Date();
    return Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  };

  // Show loading state
  if (isAuthenticated && loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#ac6d46]" />
          <span className="ml-3 text-[#616161]">Loading your expeditions...</span>
        </div>
      </div>
    );
  }

  // Show error state
  if (isAuthenticated && error) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-[#ac6d46] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 dark:text-white">{error}</h2>
          <p className="text-[#616161] mb-4">Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-6 mb-6">
        <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
          <h1 className="text-xl md:text-2xl font-bold dark:text-[#e5e5e5]">LOG JOURNAL ENTRY</h1>
          <span className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
            Session: {formatDateTime(new Date())}
          </span>
        </div>
        
        <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 border-l-2 border-[#4676ac]">
          <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">WORKFLOW:</div>
          <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono space-y-1">
            <div>STEP 1: Select existing expedition or create new expedition →</div>
            <div>STEP 2: Write and publish journal entry →</div>
            <div>STEP 3: Entry appears in your journal and expedition timeline</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Draft Expeditions */}
          {draftExpeditions.length > 0 && (
            <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] p-6">
              <div className="flex items-center gap-3 mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
                <div className="px-3 py-1 bg-[#ac6d46] text-white font-bold text-sm">DRAFT</div>
                <h2 className="text-sm font-bold dark:text-[#e5e5e5]">
                  UNSAVED EXPEDITION{draftExpeditions.length > 1 ? 'S' : ''}
                </h2>
              </div>
              <div className="space-y-3">
                {draftExpeditions.map((draft) => (
                  <div key={draft.id} className="border-2 border-[#ac6d46] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-bold text-lg dark:text-[#e5e5e5]">{draft.title || 'Untitled Draft'}</h3>
                          <span className="text-xs bg-[#ac6d46] text-white px-2 py-1">DRAFT</span>
                        </div>
                        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                          Last modified: {draft.updatedAt ? formatDateTime(new Date(draft.updatedAt)) : 'Unknown'}
                        </div>
                      </div>
                      {isMobile ? (
                        <div className="px-4 py-2 bg-[#616161] text-white text-xs text-center">
                          Open on desktop to continue in builder
                        </div>
                      ) : (
                        <Link
                          href={`/expedition-builder/${draft.id}`}
                          className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
                        >
                          CONTINUE IN BUILDER
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPTION 1: Select Current Expedition */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#ac6d46] p-6">
            <div className="flex items-center justify-between mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2 gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-[#ac6d46] text-white font-bold text-sm">OPTION 1</div>
                <h2 className="text-sm font-bold dark:text-[#e5e5e5]">
                  {view === 'completed' && `COMPLETED EXPEDITIONS (${completedExpeditions.length})`}
                  {view === 'blueprints' && `YOUR BLUEPRINTS (${publishedBlueprints.length})`}
                  {view === 'current' && 'CURRENT EXPEDITION'}
                </h2>
              </div>

              {/* View Toggles */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setView(view === 'completed' ? 'current' : 'completed')}
                  className="px-3 py-2 border-2 border-[#616161] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-xs font-bold font-mono gap-2 flex items-center"
                >
                  <Archive size={14} strokeWidth={2} />
                  <span>{view === 'completed' ? 'SHOW CURRENT' : 'SHOW COMPLETED'}</span>
                </button>
                {publishedBlueprints.length > 0 && (
                  <button
                    onClick={() => setView(view === 'blueprints' ? 'current' : 'blueprints')}
                    className="px-3 py-2 border-2 border-[#598636] text-[#598636] hover:bg-[#f5f5f5] dark:hover:bg-[#3a3a3a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#598636] text-xs font-bold font-mono gap-2 flex items-center"
                  >
                    <Compass size={14} strokeWidth={2} />
                    <span>{view === 'blueprints' ? 'SHOW CURRENT' : 'SHOW BLUEPRINTS'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Current Expedition View */}
            {view === 'current' && currentExpedition && (
              <div className="space-y-4">
                <div className="border-2 border-[#ac6d46] dark:border-[#ac6d46] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg dark:text-[#e5e5e5]">{currentExpedition.title}</h3>
                        <span className="text-xs bg-[#ac6d46] text-white px-2 py-1">
                          {(currentExpedition.status || 'active').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                        Expedition ID: {currentExpedition.id} • Day {calculateDaysActive(currentExpedition.startDate)}
                      </div>
                    </div>
                    <Link
                      href={`/log-entry/${currentExpedition.id}`}
                      className="px-6 py-3 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
                    >
                      SELECT & LOG ENTRY
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs">
                    <div className="border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                      <div className="text-[#616161] dark:text-[#b5bcc4]">Status</div>
                      <div className="font-bold dark:text-[#e5e5e5]">{(currentExpedition.status || 'active').charAt(0).toUpperCase() + (currentExpedition.status || 'active').slice(1)}</div>
                    </div>
                    <div className="border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                      <div className="text-[#616161] dark:text-[#b5bcc4]">Total Entries</div>
                      <div className="font-bold dark:text-[#e5e5e5]">{currentExpedition.entriesCount || 0}</div>
                    </div>
                    <div className="border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                      <div className="text-[#616161] dark:text-[#b5bcc4]">Sponsors</div>
                      <div className="font-bold text-[#ac6d46]">{currentExpedition.sponsorsCount || 0}</div>
                    </div>
                    <div className="border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                      <div className="text-[#616161] dark:text-[#b5bcc4]">Days Active</div>
                      <div className="font-bold dark:text-[#e5e5e5]">{calculateDaysActive(currentExpedition.startDate)}</div>
                    </div>
                  </div>

                  {/* Sponsorship Progress */}
                  {(currentExpedition.goal && currentExpedition.goal > 0) && (
                    <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3 border-l-2 border-[#ac6d46]">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="font-mono dark:text-[#e5e5e5]">${(currentExpedition.raised || 0).toLocaleString()} / ${currentExpedition.goal.toLocaleString()}</span>
                        <span className="font-bold text-[#ac6d46]">{(((currentExpedition.raised || 0) / currentExpedition.goal) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-[#b5bcc4] dark:bg-[#3a3a3a] border border-[#616161]">
                        <div className="h-full bg-[#ac6d46]" style={{ width: `${Math.min(((currentExpedition.raised || 0) / currentExpedition.goal) * 100, 100)}%` }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 border-l-2 border-[#616161]">
                  <div className="text-xs font-bold mb-1 dark:text-[#e5e5e5]">ONE EXPEDITION RULE:</div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    You can only have one active or planned expedition at a time. To start a new expedition, you must first complete or archive your current expedition.
                  </p>
                </div>
              </div>
            )}

            {/* No Current Expedition */}
            {view === 'current' && !currentExpedition && (
              <div className="text-center py-8 border-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
                <p className="text-sm text-[#616161] dark:text-[#b5bcc4] mb-4">No current expedition. Create one using Option 2 below.</p>
              </div>
            )}

            {/* Completed Expeditions View */}
            {view === 'completed' && (
              <div className="space-y-3">
                <div className="bg-[#fff8e1] dark:bg-[#3a3320] p-3 border-l-2 border-[#616161] mb-4">
                  <div className="text-xs font-bold mb-1 dark:text-[#e5e5e5]">RETROSPECTIVE ENTRIES:</div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    You can add journal entries to completed expeditions to fill in gaps or add retrospective reflections. These entries will be timestamped with their creation date.
                  </p>
                </div>

                {completedExpeditions.length === 0 ? (
                  <div className="text-center py-8 border-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">No completed expeditions yet.</p>
                  </div>
                ) : (
                  completedExpeditions.map((expedition) => {
                    const duration = expedition.startDate && expedition.endDate
                      ? Math.max(1, Math.floor((new Date(expedition.endDate).getTime() - new Date(expedition.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)
                      : 0;
                    return (
                      <div
                        key={expedition.id}
                        className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#616161] transition-all p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-serif font-bold text-base dark:text-[#e5e5e5]">{expedition.title}</h3>
                              <span className="text-xs bg-[#616161] text-white px-2 py-1">
                                COMPLETED
                              </span>
                            </div>
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono">
                              Expedition ID: {expedition.id} • {duration} days • {formatDate(expedition.startDate)} to {formatDate(expedition.endDate)}
                            </div>
                          </div>
                          <Link
                            href={`/log-entry/${expedition.id}`}
                            className="px-5 py-2 bg-[#616161] text-white font-bold hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
                          >
                            ADD ENTRY
                          </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                            <div className="text-[#616161] dark:text-[#b5bcc4]">Duration</div>
                            <div className="font-bold dark:text-[#e5e5e5]">{duration} days</div>
                          </div>
                          <div className="border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                            <div className="text-[#616161] dark:text-[#b5bcc4]">Total Entries</div>
                            <div className="font-bold dark:text-[#e5e5e5]">{expedition.entriesCount || 0}</div>
                          </div>
                          <div className="border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                            <div className="text-[#616161] dark:text-[#b5bcc4]">Total Raised</div>
                            <div className="font-bold text-[#ac6d46]">${(expedition.raised || 0).toLocaleString()}</div>
                          </div>
                          <div className="border border-[#b5bcc4] dark:border-[#3a3a3a] p-2">
                            <div className="text-[#616161] dark:text-[#b5bcc4]">Sponsors</div>
                            <div className="font-bold dark:text-[#e5e5e5]">{expedition.sponsorsCount || 0}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Blueprints View — launch one of the user's own published
                blueprints as a journal expedition. Same flow as external
                adopters, except the resulting expedition stays
                route-unlocked so the guide can tweak waypoints in the
                field. */}
            {view === 'blueprints' && (
              <div className="space-y-3">
                <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3 border-l-2 border-[#598636] mb-4">
                  <div className="text-xs font-bold mb-1 dark:text-[#e5e5e5]">LAUNCH A BLUEPRINT:</div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Copies the blueprint into a new standard expedition you
                    can journal against. Route stays editable on launches of
                    your own blueprints.
                  </p>
                </div>

                {publishedBlueprints.length === 0 ? (
                  <div className="text-center py-8 border-2 border-[#b5bcc4] dark:border-[#3a3a3a]">
                    <p className="text-sm text-[#616161] dark:text-[#b5bcc4]">No published blueprints yet.</p>
                  </div>
                ) : (
                  publishedBlueprints.map((blueprint) => {
                    const isLaunching = launchingBlueprintId === blueprint.id;
                    return (
                      <div key={blueprint.id} className="border-2 border-[#598636] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Compass size={16} className="text-[#598636] flex-shrink-0" />
                              <h3 className="font-bold text-lg dark:text-[#e5e5e5]">{blueprint.title || 'Untitled Blueprint'}</h3>
                              <span className="text-xs bg-[#598636] text-white px-2 py-1">PUBLISHED</span>
                            </div>
                            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] font-mono flex flex-wrap gap-x-3 gap-y-1">
                              {blueprint.mode && <span>{blueprint.mode.toUpperCase()}</span>}
                              {typeof blueprint.totalDistanceKm === 'number' && blueprint.totalDistanceKm > 0 && (
                                <span>{blueprint.totalDistanceKm.toFixed(1)} km</span>
                              )}
                              {typeof blueprint.adoptionsCount === 'number' && blueprint.adoptionsCount > 0 && (
                                <span>{blueprint.adoptionsCount} adoption{blueprint.adoptionsCount === 1 ? '' : 's'}</span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLaunchBlueprint(blueprint.id)}
                            disabled={isLaunching || !!currentExpedition}
                            title={currentExpedition ? 'Finish or archive your current expedition first' : undefined}
                            className="px-6 py-3 bg-[#598636] text-white font-bold hover:bg-[#476b2b] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#598636] text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {isLaunching ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                LAUNCHING...
                              </>
                            ) : (
                              <>
                                <Rocket size={14} />
                                LAUNCH &amp; LOG ENTRY
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* OPTION 2: Create New Expedition */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#4676ac] p-6">
            <div className="flex items-center gap-3 mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
              <div className="px-3 py-1 bg-[#4676ac] text-white font-bold text-sm">OPTION 2</div>
              <h2 className="text-sm font-bold dark:text-[#e5e5e5]">
                CREATE NEW EXPEDITION
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Quick Entry */}
              <div className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46] transition-all p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-[#ac6d46] text-white">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base dark:text-[#e5e5e5]">QUICK ENTRY</h3>
                </div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                  Create a simple expedition quickly without advanced route planning. Perfect for single-location expeditions.
                </p>
                <ul className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46]">•</span>
                    <span>Fast creation (2-3 minutes)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46]">•</span>
                    <span>All essential fields in one form</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#ac6d46]">•</span>
                    <span>Optional sponsorship setup</span>
                  </li>
                </ul>
                <Link
                  href="/expedition-quick-entry"
                  className="w-full block text-center px-4 py-2 bg-[#ac6d46] text-white font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm"
                >
                  QUICK ENTRY
                </Link>
              </div>

              {/* Expedition Builder (Pro Only) */}
              <div className={`border-2 p-5 ${isPro ? 'border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#4676ac]' : 'border-[#b5bcc4] dark:border-[#3a3a3a] opacity-70'} transition-all`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 text-white ${isPro ? 'bg-[#4676ac]' : 'bg-[#616161]'}`}>
                    <Map className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base dark:text-[#e5e5e5]">EXPEDITION BUILDER</h3>
                  {!isPro && <span className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-bold">PRO</span>}
                </div>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                  Use the Expedition Builder for multi-waypoint expeditions with detailed route planning and interactive maps.
                </p>
                <ul className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1 mb-4">
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac]">•</span>
                    <span>Interactive map with waypoints</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac]">•</span>
                    <span>Distance calculations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#4676ac]">•</span>
                    <span>Visual route display</span>
                  </li>
                </ul>
                {isPro ? (
                  isMobile ? (
                    <div className="w-full text-center px-4 py-2 bg-[#616161] text-white text-xs">
                      Open on desktop to use the builder
                    </div>
                  ) : (
                    <Link
                      href="/expedition-builder?mode=expedition"
                      className="w-full block text-center px-4 py-2 bg-[#4676ac] text-white font-bold hover:bg-[#365a8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] text-sm"
                    >
                      EXPEDITION BUILDER
                    </Link>
                  )
                ) : (
                  <div>
                    <div className="w-full text-center px-4 py-2 bg-[#616161] text-white font-bold cursor-not-allowed text-sm opacity-60">
                      EXPLORER PRO REQUIRED
                    </div>
                    <div className="mt-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#ac6d46] text-xs text-[#616161] dark:text-[#b5bcc4]">
                      <strong className="text-[#ac6d46]">PRO FEATURE:</strong> The Expedition Builder with waypoints, route planning, and interactive maps requires Explorer Pro.{' '}
                      <Link href="/settings/billing" className="text-[#4676ac] hover:underline">Upgrade to Pro</Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OPTION 3: Standalone Entry (NEW FEATURE) */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#616161] p-6">
            <div className="flex items-center gap-3 mb-4 border-b-2 border-[#202020] dark:border-[#616161] pb-2">
              <div className="px-3 py-1 bg-[#616161] text-white font-bold text-sm">OPTION 3</div>
              <h2 className="text-sm font-bold dark:text-[#e5e5e5]">
                STANDALONE ENTRY
              </h2>
              <span className="px-2 py-1 bg-[#4676ac] text-white text-xs font-bold">NEW FEATURE</span>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#616161] text-white">
                <FileText className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold mb-2 dark:text-[#e5e5e5]">LOG A ONE-OFF ENTRY</h3>
                <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-4">
                  Create a journal entry that is not associated with any expedition. Perfect for spontaneous observations, reflections, or experiences that don't fit into a specific expedition narrative.
                </p>
                
                <div className="bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4 border-l-2 border-[#616161] mb-4">
                  <div className="text-xs font-bold mb-2 dark:text-[#e5e5e5]">USE CASES:</div>
                  <ul className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-[#616161]">•</span>
                      <span>Quick thoughts or observations while traveling</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#616161]">•</span>
                      <span>Personal reflections not tied to a specific journey</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#616161]">•</span>
                      <span>One-off experiences or encounters</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#616161]">•</span>
                      <span>Test entries before starting an expedition</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#fff8e1] dark:bg-[#3a3320] p-3 border-l-2 border-[#ac6d46] mb-4">
                  <div className="text-xs font-bold mb-1 dark:text-[#e5e5e5]">NOTE:</div>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Standalone entries appear in your journal but are not connected to any expedition. They will not contribute to expedition statistics.
                  </p>
                </div>

                <Link
                  href="/log-entry/standalone"
                  className="inline-block px-6 py-3 bg-[#616161] text-white font-bold hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#616161] text-sm"
                >
                  LOG STANDALONE ENTRY
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              YOUR STATISTICS
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Total Expeditions</span>
                <span className="font-bold dark:text-[#e5e5e5]">{expeditions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Current Expedition</span>
                <span className="font-bold text-[#ac6d46]">{activeExpeditions.length > 0 ? `${activeExpeditions.length} Active` : 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Completed</span>
                <span className="font-bold dark:text-[#e5e5e5]">{completedExpeditions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Total Entries</span>
                <span className="font-bold dark:text-[#e5e5e5]">{expeditions.reduce((acc, exp) => acc + (exp.entriesCount || 0), 0)}</span>
              </div>
              <div className="flex justify-between border-t border-[#b5bcc4] dark:border-[#3a3a3a] pt-2">
                <span className="text-[#616161] dark:text-[#b5bcc4]">Total Sponsored</span>
                <span className="font-bold text-[#ac6d46]">${expeditions.reduce((acc, exp) => acc + (exp.raised || 0), 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] p-4">
            <h3 className="text-xs font-bold mb-3 border-b border-[#202020] dark:border-[#616161] pb-2 dark:text-[#e5e5e5]">
              JOURNAL ENTRY GUIDELINES
            </h3>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Write honestly about your experiences</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Include location data (approximate region)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Add photos and videos when possible</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Tag relevant subjects and themes</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>Respect local privacy and cultural sensitivities</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#ac6d46]">•</span>
                <span>No promotional content or spam</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}