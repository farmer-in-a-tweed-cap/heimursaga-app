'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, MapPin, Save, Globe, Users, Lock, AlertTriangle } from 'lucide-react';
import { CurrentLocationSelector } from './CurrentLocationSelector';

type LocationVisibility = 'public' | 'sponsors' | 'private';

interface Waypoint {
  id: string;
  title: string;
  location: string;
  coords: { lat: number; lng: number };
  date: string;
  status: 'completed' | 'current' | 'planned';
  notes?: string;
}

interface JournalEntry {
  id: string;
  title: string;
  date: string;
  location: string;
  coords: { lat: number; lng: number };
  type: 'standard' | 'photo-essay' | 'data-log' | 'waypoint';
}

interface UpdateLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  expeditionTitle: string;
  waypoints: Waypoint[];
  journalEntries: JournalEntry[];
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  currentLocationVisibility?: LocationVisibility;
  expeditionStatus?: 'active' | 'planned' | 'completed';
  onSave: (source: 'waypoint' | 'entry', id: string, visibility: LocationVisibility) => Promise<void>;
}

const VISIBILITY_OPTIONS: { value: LocationVisibility; label: string; description: string; icon: typeof Globe }[] = [
  {
    value: 'public',
    label: 'PUBLIC',
    description: 'Visible to everyone',
    icon: Globe,
  },
  {
    value: 'sponsors',
    label: 'SPONSORS ONLY',
    description: 'Only your sponsors can see',
    icon: Users,
  },
  {
    value: 'private',
    label: 'PRIVATE',
    description: 'Only visible to you',
    icon: Lock,
  },
];

export function UpdateLocationModal({
  isOpen,
  onClose,
  expeditionTitle,
  waypoints,
  journalEntries,
  currentLocationSource,
  currentLocationId,
  currentLocationVisibility = 'public',
  expeditionStatus,
  onSave,
}: UpdateLocationModalProps) {
  const [selectedSource, setSelectedSource] = useState<'waypoint' | 'entry'>(
    currentLocationSource || (waypoints.length > 0 ? 'waypoint' : 'entry')
  );
  const [selectedId, setSelectedId] = useState(currentLocationId || '');
  const [visibility, setVisibility] = useState<LocationVisibility>(currentLocationVisibility);
  const [isSaving, setIsSaving] = useState(false);

  // Determine if saving will auto-activate the expedition
  const willActivate = useMemo(() => {
    if (expeditionStatus !== 'planned' || !selectedId) return false;
    // Not the start point = will activate
    const firstWaypointId = waypoints[0]?.id;
    const isStartPoint = selectedSource === 'waypoint' && selectedId === firstWaypointId;
    return !isStartPoint;
  }, [expeditionStatus, selectedId, selectedSource, waypoints]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedSource(currentLocationSource || (waypoints.length > 0 ? 'waypoint' : 'entry'));
      setSelectedId(currentLocationId || '');
      setVisibility(currentLocationVisibility);
    }
  }, [isOpen, currentLocationSource, currentLocationId, currentLocationVisibility, waypoints.length]);

  const handleSave = async () => {
    if (!selectedId) return;

    setIsSaving(true);

    try {
      await onSave(selectedSource, selectedId, visibility);
      onClose();
    } catch (error) {
      console.error('Failed to update location:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#202020]/80 z-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div
          className="bg-white dark:bg-[#202020] border-4 border-[#202020] dark:border-[#616161] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-[#4676ac] text-white p-4 border-b-4 border-[#202020] dark:border-[#616161]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6" />
                <div>
                  <h2 className="text-lg font-bold">UPDATE CURRENT LOCATION</h2>
                  <div className="text-xs font-mono opacity-90">{expeditionTitle}</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-white/50"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 p-4 bg-[#f0f4f8] dark:bg-[#2a2a2a] border-l-4 border-[#4676ac]">
              <div className="text-xs font-bold mb-2 text-[#202020] dark:text-[#e5e5e5]">
                QUICK LOCATION UPDATE:
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                Select a waypoint or journal entry to set as your current location. This updates where you are on the map and in expedition details. The location data (coordinates and place name) will be pulled from the selected waypoint or entry.
              </div>
            </div>

            <CurrentLocationSelector
              waypoints={waypoints}
              journalEntries={journalEntries}
              selectedSource={selectedSource}
              selectedId={selectedId}
              onSourceChange={setSelectedSource}
              onLocationChange={setSelectedId}
            />

            {/* Visibility Setting */}
            <div className="mt-6">
              <div className="text-xs font-bold font-mono mb-3 text-[#202020] dark:text-[#e5e5e5]">
                LOCATION PRIVACY
              </div>
              <div className="grid grid-cols-3 gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      className={`p-3 border-2 text-left transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'border-[#ac6d46] bg-[#ac6d46]/10 dark:bg-[#ac6d46]/20'
                          : 'border-[#202020]/20 dark:border-[#616161] hover:border-[#202020]/40 dark:hover:border-[#b5bcc4]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#ac6d46]' : 'text-[#616161] dark:text-[#b5bcc4]'}`} />
                        <span className={`text-xs font-bold font-mono ${isSelected ? 'text-[#ac6d46]' : 'text-[#202020] dark:text-[#e5e5e5]'}`}>
                          {opt.label}
                        </span>
                      </div>
                      <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                        {opt.description}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 p-3 bg-[#f5f5f5] dark:bg-[#2a2a2a] border-l-2 border-[#616161]">
                <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
                  {visibility === 'public' && (
                    <>Your current location, coordinates, and progress on the map will be visible to all visitors. The route and waypoints are always visible.</>
                  )}
                  {visibility === 'sponsors' && (
                    <>Only your sponsors will see your current location marker, coordinates, and progress line on the map. Other visitors will see the route and waypoints but not where you are now.</>
                  )}
                  {visibility === 'private' && (
                    <>Your current location is hidden from all visitors. Only you will see the progress marker and copper line on the map. Others will see the route and waypoints only.</>
                  )}
                </div>
              </div>
            </div>

            {/* Activation Warning */}
            {willActivate && (
              <div className="mt-6 p-5 bg-[#ac6d46] text-white border-4 border-[#202020] dark:border-[#616161]">
                <div className="flex items-start gap-4">
                  <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold font-mono tracking-wide mb-2">
                      THIS WILL START YOUR EXPEDITION
                    </div>
                    <div className="text-xs text-white/80 leading-relaxed">
                      Setting your location beyond the start point will automatically change this expedition from <span className="font-bold text-white">planned</span> to <span className="font-bold text-white">active</span>. The start date will be set to today if not already set. This action cannot be undone from this modal.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t-4 border-[#202020] dark:border-[#616161] p-4 bg-[#f5f5f5] dark:bg-[#2a2a2a]">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                {selectedId ? (
                  <span className="font-mono">
                    ✓ Location selected: <span className="font-bold text-[#4676ac]">{selectedId}</span>
                  </span>
                ) : (
                  <span>Select a location to continue</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border-2 border-[#202020] dark:border-[#616161] dark:text-[#e5e5e5] hover:bg-[#202020] hover:text-white dark:hover:bg-[#4a4a4a] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#202020] dark:focus-visible:ring-[#616161] text-sm font-bold disabled:opacity-50 disabled:active:scale-100"
                  disabled={isSaving}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedId || isSaving}
                  className="px-6 py-2 bg-[#ac6d46] text-white hover:bg-[#8a5738] transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:ring-[#ac6d46] text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'SAVING...' : 'SAVE LOCATION'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
