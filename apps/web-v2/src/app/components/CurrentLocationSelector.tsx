'use client';

import { MapPin, FileText, Navigation } from 'lucide-react';

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

interface CurrentLocationSelectorProps {
  waypoints: Waypoint[];
  journalEntries: JournalEntry[];
  selectedSource: 'waypoint' | 'entry';
  selectedId: string;
  onSourceChange: (source: 'waypoint' | 'entry') => void;
  onLocationChange: (id: string) => void;
  disabled?: boolean;
}

export function CurrentLocationSelector({
  waypoints,
  journalEntries,
  selectedSource,
  selectedId,
  onSourceChange,
  onLocationChange,
  disabled = false,
}: CurrentLocationSelectorProps) {
  const hasWaypoints = waypoints.length > 0;
  const hasEntries = journalEntries.length > 0;
  const hasNoLocations = !hasWaypoints && !hasEntries;

  // Get the currently selected item details
  const selectedItem = selectedSource === 'waypoint'
    ? waypoints.find(w => w.id === selectedId)
    : journalEntries.find(e => e.id === selectedId);

  // Format entry type badge
  const getEntryTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; color: string }> = {
      'standard': { label: 'STANDARD', color: 'bg-[#616161]' },
      'photo-essay': { label: 'PHOTO ESSAY', color: 'bg-[#ac6d46]' },
      'data-log': { label: 'DATA LOG', color: 'bg-[#4676ac]' },
      'waypoint': { label: 'WAYPOINT', color: 'bg-[#b5bcc4]' },
    };
    return typeMap[type] || typeMap.standard;
  };

  // Format waypoint status badge
  const getWaypointStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      'completed': { label: 'COMPLETED', color: 'bg-[#ac6d46]' },
      'current': { label: 'CURRENT', color: 'bg-[#4676ac]' },
      'planned': { label: 'PLANNED', color: 'bg-[#b5bcc4]' },
    };
    return statusMap[status] || statusMap.planned;
  };

  // If no locations exist, show disabled state
  if (hasNoLocations || disabled) {
    return (
      <div className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] bg-[#f5f5f5] dark:bg-[#2a2a2a] p-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-[#616161] dark:text-[#b5bcc4] flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold mb-1 text-[#616161] dark:text-[#b5bcc4]">
              CURRENT LOCATION TRACKING DISABLED
            </div>
            <div className="text-xs text-[#616161] dark:text-[#b5bcc4] leading-relaxed">
              {disabled 
                ? 'Current location tracking is only available for ACTIVE expeditions.'
                : 'No locations logged yet. Log your first journal entry or waypoint to enable current location tracking.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Source Selection */}
      <div className="border-2 border-[#b5bcc4] dark:border-[#3a3a3a] p-4">
        <div className="text-xs font-bold mb-3 text-[#202020] dark:text-[#e5e5e5]">
          SELECT LOCATION SOURCE:
        </div>
        
        <div className="space-y-2">
          <label className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all ${
            selectedSource === 'waypoint' 
              ? 'border-[#ac6d46] bg-[#fff5f0] dark:bg-[#2a2a2a]' 
              : 'border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46]'
          } ${!hasWaypoints ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name="locationSource"
              value="waypoint"
              checked={selectedSource === 'waypoint'}
              onChange={() => hasWaypoints && onSourceChange('waypoint')}
              disabled={!hasWaypoints}
              className="w-4 h-4 accent-[#ac6d46]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#4676ac]" />
                <span className="text-sm font-bold dark:text-[#e5e5e5]">SELECT FROM WAYPOINTS</span>
                <span className="px-2 py-0.5 bg-[#4676ac] text-white text-xs font-bold">
                  {waypoints.length} AVAILABLE
                </span>
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                Use a planned/completed waypoint as current location
              </div>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all ${
            selectedSource === 'entry' 
              ? 'border-[#ac6d46] bg-[#fff5f0] dark:bg-[#2a2a2a]' 
              : 'border-[#b5bcc4] dark:border-[#3a3a3a] hover:border-[#ac6d46]'
          } ${!hasEntries ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <input
              type="radio"
              name="locationSource"
              value="entry"
              checked={selectedSource === 'entry'}
              onChange={() => hasEntries && onSourceChange('entry')}
              disabled={!hasEntries}
              className="w-4 h-4 accent-[#ac6d46]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#ac6d46]" />
                <span className="text-sm font-bold dark:text-[#e5e5e5]">SELECT FROM JOURNAL ENTRIES</span>
                <span className="px-2 py-0.5 bg-[#ac6d46] text-white text-xs font-bold">
                  {journalEntries.length} AVAILABLE
                </span>
              </div>
              <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
                Use a journal entry's location as current location
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Location Dropdown */}
      <div>
        <label className="block text-xs font-medium mb-2 text-[#202020] dark:text-[#e5e5e5]">
          {selectedSource === 'waypoint' ? 'SELECT WAYPOINT:' : 'SELECT JOURNAL ENTRY:'}
        </label>
        
        <select
          value={selectedId}
          onChange={(e) => onLocationChange(e.target.value)}
          className="w-full px-4 py-3 border-2 border-[#b5bcc4] dark:border-[#3a3a3a] focus:border-[#ac6d46] outline-none text-sm dark:bg-[#2a2a2a] dark:text-[#e5e5e5] font-mono"
        >
          <option value="">-- Select a {selectedSource === 'waypoint' ? 'waypoint' : 'journal entry'} --</option>
          
          {selectedSource === 'waypoint' ? (
            waypoints.map((wp) => (
              <option key={wp.id} value={wp.id}>
                {wp.title} • {wp.location} • {wp.date} • {wp.status?.toUpperCase() || ''}
              </option>
            ))
          ) : (
            journalEntries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title} • {entry.location} • {entry.date} • {entry.type?.toUpperCase() || ''}
              </option>
            ))
          )}
        </select>

        <div className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1">
          {selectedSource === 'waypoint' 
            ? `Choose from ${waypoints.length} logged waypoint${waypoints.length !== 1 ? 's' : ''} (sorted by date)`
            : `Choose from ${journalEntries.length} journal entr${journalEntries.length !== 1 ? 'ies' : 'y'} (sorted by date)`
          }
        </div>
      </div>

      {/* Selected Location Details */}
      {selectedItem && (
        <div className="border-2 border-[#4676ac] bg-[#f0f4f8] dark:bg-[#2a2a2a] p-4">
          <div className="text-xs font-bold mb-3 border-b-2 border-[#4676ac] pb-2 text-[#202020] dark:text-[#e5e5e5]">
            SELECTED LOCATION DETAILS:
          </div>
          
          <div className="space-y-2 text-xs font-mono">
            <div className="flex gap-2">
              <span className="text-[#616161] dark:text-[#b5bcc4] min-w-[100px]">
                {selectedSource === 'waypoint' ? 'Waypoint ID:' : 'Entry ID:'}
              </span>
              <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{selectedItem.id}</span>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[#616161] dark:text-[#b5bcc4] min-w-[100px]">Title:</span>
              <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                {'title' in selectedItem ? selectedItem.title : ''}
              </span>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[#616161] dark:text-[#b5bcc4] min-w-[100px]">Location:</span>
              <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{selectedItem.location}</span>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[#616161] dark:text-[#b5bcc4] min-w-[100px]">Coordinates:</span>
              <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">
                {selectedItem.coords.lat.toFixed(4)}°N, {selectedItem.coords.lng.toFixed(4)}°E
              </span>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[#616161] dark:text-[#b5bcc4] min-w-[100px]">Date:</span>
              <span className="font-bold text-[#202020] dark:text-[#e5e5e5]">{selectedItem.date}</span>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[#616161] dark:text-[#b5bcc4] min-w-[100px]">
                {selectedSource === 'waypoint' ? 'Status:' : 'Type:'}
              </span>
              <span>
                {selectedSource === 'waypoint' && 'status' in selectedItem ? (
                  <span className={`px-2 py-0.5 ${getWaypointStatusBadge(selectedItem.status).color} text-white text-xs font-bold`}>
                    {getWaypointStatusBadge(selectedItem.status).label}
                  </span>
                ) : 'type' in selectedItem ? (
                  <span className={`px-2 py-0.5 ${getEntryTypeBadge(selectedItem.type).color} text-white text-xs font-bold`}>
                    {getEntryTypeBadge(selectedItem.type).label}
                  </span>
                ) : null}
              </span>
            </div>

            {selectedSource === 'waypoint' && 'notes' in selectedItem && selectedItem.notes && (
              <div className="pt-2 border-t border-[#4676ac]">
                <div className="text-[#616161] dark:text-[#b5bcc4] mb-1">Notes:</div>
                <div className="text-[#202020] dark:text-[#e5e5e5]">{selectedItem.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}