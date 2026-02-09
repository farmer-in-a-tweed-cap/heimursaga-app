'use client';

import { X, CheckCircle2, Calendar, AlertTriangle, Edit } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/app/utils/dateFormat';

interface ExpeditionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  expedition: {
    id: string;
    title: string;
    status: 'active' | 'planned' | 'completed';
    startDate: string;
    estimatedEndDate: string;
    daysActive: number;
    journalEntries: number;
    totalDistance?: number;
    totalFunding?: number;
    backers?: number;
  };
  onStatusChange?: (newStatus: 'active' | 'completed') => void;
}

export function ExpeditionManagementModal({
  isOpen,
  onClose,
  expedition,
  onStatusChange,
}: ExpeditionManagementModalProps) {
  const router = useRouter();
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [actualEndDate, setActualEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Calculate actual duration if completing
  const actualDuration = expedition.daysActive;

  // Determine if expedition can be completed
  const canComplete = (isActive || (isPlanned && hasStarted)) && !isCompleted;
  const canActivate = isPlanned && hasStarted && !isCompleted;

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    try {
      // ============================================================
      // 🔴 BACKEND API CALL NEEDED
      // ============================================================
      // Endpoint: PATCH /api/expeditions/:expeditionId/status
      // Body: { status: 'completed', actualEndDate: actualEndDate }
      // Description: Mark expedition as completed
      // Response: Updated expedition object
      // ============================================================
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      if (onStatusChange) {
        onStatusChange('completed');
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to complete expedition:', error);
    } finally {
      setIsSubmitting(false);
      setConfirmComplete(false);
    }
  };

  const handleActivate = async () => {
    setIsSubmitting(true);
    
    try {
      // ============================================================
      // 🔴 BACKEND API CALL NEEDED
      // ============================================================
      // Endpoint: PATCH /api/expeditions/:expeditionId/status
      // Body: { status: 'active' }
      // Description: Activate a planned expedition that has reached start date
      // Response: Updated expedition object
      // ============================================================
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      
      if (onStatusChange) {
        onStatusChange('active');
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to activate expedition:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#202020]/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b-2 border-[#202020] dark:border-[#616161] bg-[#616161] text-white flex items-center justify-between">
          <h2 className="text-lg font-bold">MANAGE EXPEDITION</h2>
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
            {/* Edit Details & Waypoints - Always available */}
            <div className="border-2 border-[#4676ac] p-4">
              <div className="flex items-start gap-3 mb-4">
                <Edit size={20} className="text-[#4676ac] mt-0.5" strokeWidth={2} />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                    EDIT EXPEDITION DETAILS
                  </h4>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                    Modify expedition details, dates, description, waypoints, and route planning. Changes will be reflected immediately across all journal views.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/expedition-builder/${expedition.id}`)}
                className="w-full px-4 py-3 bg-[#4676ac] text-white text-sm font-bold hover:bg-[#3a5f8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] flex items-center justify-center gap-2"
              >
                <Edit size={16} strokeWidth={2} />
                <span>EDIT DETAILS & WAYPOINTS</span>
              </button>
            </div>

            {/* Activate Planned Expedition */}
            {canActivate && (
              <div className="border-2 border-[#4676ac] p-4">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 size={20} className="text-[#4676ac] mt-0.5" strokeWidth={2} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      ACTIVATE EXPEDITION
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                      This expedition has reached its start date. Activate it to begin logging entries and receiving sponsorships.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleActivate}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 bg-[#4676ac] text-white text-sm font-bold hover:bg-[#3a5f8a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#4676ac] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isSubmitting ? 'ACTIVATING...' : 'ACTIVATE EXPEDITION'}
                </button>
              </div>
            )}

            {/* Complete Expedition */}
            {canComplete && !confirmComplete && (
              <div className="border-2 border-[#ac6d46] p-4">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 size={20} className="text-[#ac6d46] mt-0.5" strokeWidth={2} />
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-2">
                      MARK EXPEDITION AS COMPLETE
                    </h4>
                    <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mb-3">
                      Mark this expedition as complete when you have finished your journey. This will close sponsorships for new supporters but you can continue adding retrospective journal entries. Your journal and all entries will remain publicly visible.
                    </p>
                    {isPastEstimatedEnd && (
                      <div className="flex items-start gap-2 p-3 bg-[#fff8e1] dark:bg-[#3a3320] border-l-2 border-[#ac6d46] mb-3">
                        <AlertTriangle size={14} className="text-[#ac6d46] mt-0.5" strokeWidth={2} />
                        <span className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                          This expedition is past its estimated end date ({formatDate(expedition.estimatedEndDate)}). You may want to mark it as complete.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmComplete(true)}
                  className="w-full px-4 py-3 bg-[#ac6d46] text-white text-sm font-bold hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46]"
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
                    <input
                      type="date"
                      value={actualEndDate}
                      onChange={(e) => setActualEndDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      min={expedition.startDate}
                      className="w-full px-3 py-2 border-2 border-[#202020] dark:border-[#616161] bg-white dark:bg-[#2a2a2a] text-[#202020] dark:text-[#e5e5e5] text-xs font-mono"
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
                      <li>• Sponsorships will be closed (no new sponsors accepted)</li>
                      <li>• All journal entries and expedition content remain public</li>
                      <li>• You can still add retrospective journal entries after completion</li>
                      <li>• You can create a new expedition after completing this one</li>
                      <li>• Final statistics will be calculated and archived</li>
                    </ul>
                  </div>

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
                    CANCEL
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
                      This expedition has not reached its start date yet ({formatDate(expedition.startDate)}). You cannot complete an expedition that has not started. You can activate it manually once the start date arrives, or it will activate automatically on the start date.
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
          </div>
        </div>
      </div>
    </div>
  );
}