'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Upload,
  X,
  FileText,
  Loader2,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import type { Position } from 'geojson';
import {
  parseRouteFileInBrowser,
  ROUTE_IMPORT_LIMITS,
  type ImportedRoute,
  type ImportedRouteWaypoint,
} from '@/app/utils/routeFileParser';

interface RouteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called when the guide clicks APPLY IMPORT. Receives the parsed + edited
   * route. The parent is responsible for merging this into builder state and
   * (if a draft exists) POSTing the original File to the import endpoint for
   * authoritative server-side parsing.
   */
  onImport: (route: ImportedRoute, file: File) => void;
  /**
   * Number of waypoints currently in the builder. Used to warn the guide when
   * applying the import will replace existing work.
   */
  existingWaypointCount: number;
  descriptionMaxChars: number;
}

const ACCEPTED_EXTS = ['.gpx', '.kml', '.geojson', '.json'];
const ACCEPT_ATTR = [
  '.gpx',
  '.kml',
  '.geojson',
  '.json',
  'application/gpx+xml',
  'application/vnd.google-earth.kml+xml',
  'application/geo+json',
  'application/json',
].join(',');

export function RouteImportModal({
  isOpen,
  onClose,
  onImport,
  existingWaypointCount,
  descriptionMaxChars,
}: RouteImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [route, setRoute] = useState<ImportedRoute | null>(null);
  const [editableWaypoints, setEditableWaypoints] = useState<ImportedRouteWaypoint[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setRoute(null);
    setEditableWaypoints([]);
    setParseError(null);
    setIsParsing(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handleFileSelected = useCallback(async (selected: File) => {
    const ext = '.' + (selected.name.toLowerCase().split('.').pop() || '');
    if (!ACCEPTED_EXTS.includes(ext)) {
      setParseError(
        `Unsupported file extension "${ext}". Supported: ${ACCEPTED_EXTS.join(', ')}`,
      );
      return;
    }

    setFile(selected);
    setParseError(null);
    setIsParsing(true);

    try {
      const parsed = await parseRouteFileInBrowser(selected);
      setRoute(parsed);
      setEditableWaypoints(parsed.waypoints);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file';
      setParseError(msg);
      setRoute(null);
      setEditableWaypoints([]);
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) void handleFileSelected(dropped);
    },
    [handleFileSelected],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) void handleFileSelected(selected);
      // Reset so re-selecting the same file triggers onChange again
      if (e.target) e.target.value = '';
    },
    [handleFileSelected],
  );

  const handleWaypointFieldChange = useCallback(
    (
      index: number,
      field: 'title' | 'description',
      value: string,
    ) => {
      setEditableWaypoints((prev) =>
        prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)),
      );
    },
    [],
  );

  const handleDeleteWaypoint = useCallback((index: number) => {
    setEditableWaypoints((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((w, i) => ({ ...w, sequence: i })),
    );
  }, []);

  const handleApply = useCallback(() => {
    if (!route || !file) return;
    const finalRoute: ImportedRoute = {
      ...route,
      waypoints: editableWaypoints.map((w, i) => ({ ...w, sequence: i })),
    };
    onImport(finalRoute, file);
    resetState();
    onClose();
  }, [route, file, editableWaypoints, onImport, onClose, resetState]);

  // Build preview geometry. Prefer the imported trackline; if the file only
  // has waypoints (no <trk>/LineString), fall back to connecting waypoints
  // with straight segments so the preview is never blank.
  const previewCoords = useMemo((): Position[] => {
    if (!route) return [];
    if (route.trackPoints.length >= 2) return route.trackPoints;
    if (editableWaypoints.length >= 2) {
      return editableWaypoints.map((w) => [w.lon, w.lat] as Position);
    }
    return [];
  }, [route, editableWaypoints]);

  const usingTrackline = !!route && route.trackPoints.length >= 2;

  const svgPath = useMemo(() => {
    if (previewCoords.length < 2) return null;
    return buildSvgPath(previewCoords, 280, 120);
  }, [previewCoords]);

  const waypointMarkers = useMemo(() => {
    if (!route || editableWaypoints.length === 0) return [];
    const boundsSource =
      previewCoords.length > 0
        ? previewCoords
        : editableWaypoints.map((w) => [w.lon, w.lat] as Position);
    return projectPoints(
      editableWaypoints.map((w) => [w.lon, w.lat] as Position),
      boundsSource,
      280,
      120,
    );
  }, [route, editableWaypoints, previewCoords]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="absolute inset-0 bg-[#202020]/70" onClick={handleClose} />
      <div className="relative w-[95%] max-w-3xl bg-white dark:bg-[#202020] border-2 border-[#202020] dark:border-[#616161] my-8">
        {/* Header */}
        <div className="bg-[#598636] text-white p-4 border-b-2 border-[#202020] dark:border-[#616161] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload size={18} strokeWidth={2.5} />
            <h3 className="text-sm font-bold tracking-wide">
              IMPORT ROUTE FILE
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[#4a702c] rounded-sm"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: file picker */}
          {!route && (
            <>
              <div>
                <label className="block text-xs font-bold tracking-wide mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  UPLOAD ROUTE FILE
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragActive(false);
                  }}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer border-2 border-dashed ${
                    isDragActive
                      ? 'border-[#598636] bg-[#598636]/5'
                      : 'border-[#b5bcc4] dark:border-[#616161] hover:border-[#598636] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a]'
                  } p-8 text-center transition-colors`}
                >
                  <Upload
                    size={28}
                    strokeWidth={2}
                    className="mx-auto mb-3 text-[#598636]"
                  />
                  <p className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5] mb-1">
                    Drop a route file here or click to browse
                  </p>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4]">
                    Supports GPX, KML, GeoJSON — from Gaia GPS, CalTopo, Garmin,
                    AllTrails, Komoot, etc.
                  </p>
                  <p className="text-xs text-[#616161] dark:text-[#b5bcc4] mt-1 font-mono">
                    Max {ROUTE_IMPORT_LIMITS.MAX_FILE_BYTES / (1024 * 1024)} MB
                    &nbsp;·&nbsp; {ROUTE_IMPORT_LIMITS.MAX_WAYPOINTS} waypoints
                    &nbsp;·&nbsp; {ROUTE_IMPORT_LIMITS.MAX_TRACKPOINTS.toLocaleString()} track points
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTR}
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>

              {isParsing && (
                <div className="flex items-center gap-2 text-xs text-[#616161] dark:text-[#b5bcc4]">
                  <Loader2 size={14} className="animate-spin" />
                  Parsing {file?.name}…
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2 p-3 border-2 border-[#994040] bg-[#994040]/5 text-xs text-[#994040]">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">{parseError}</div>
                </div>
              )}
            </>
          )}

          {/* Step 2: review + edit */}
          {route && (
            <>
              {existingWaypointCount > 0 && (
                <div className="flex items-start gap-2 p-3 border-2 border-[#ac6d46] bg-[#ac6d46]/5 text-xs text-[#ac6d46]">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    Applying this import will replace {existingWaypointCount}{' '}
                    existing waypoint{existingWaypointCount === 1 ? '' : 's'}{' '}
                    in your builder.
                  </div>
                </div>
              )}

              {/* Summary strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                <SummaryCell
                  label="FORMAT"
                  value={route.sourceFormat.toUpperCase()}
                />
                <SummaryCell
                  label="WAYPOINTS"
                  value={editableWaypoints.length.toLocaleString()}
                />
                <SummaryCell
                  label="TRACK POINTS"
                  value={route.trackPoints.length.toLocaleString()}
                />
                <SummaryCell
                  label="DISTANCE"
                  value={`${route.distanceKm.toFixed(1)} km`}
                />
              </div>

              {/* Preview polyline — always rendered so the guide can confirm
                  something was parsed. When the file has no trackline we fall
                  back to a dashed stroke connecting waypoints. */}
              <div>
                <div className="text-xs font-bold tracking-wide mb-2 text-[#202020] dark:text-[#e5e5e5]">
                  ROUTE PREVIEW
                  {!usingTrackline && (
                    <span className="ml-2 font-mono font-normal text-[10px] text-[#616161] dark:text-[#b5bcc4]">
                      (waypoint-only — no trackline in file)
                    </span>
                  )}
                </div>
                <div className="border-2 border-[#b5bcc4] dark:border-[#616161] bg-[#f5f5f5] dark:bg-[#2a2a2a] p-3">
                  {svgPath ? (
                    <svg
                      viewBox="0 0 280 120"
                      className="w-full h-auto"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <path
                        d={svgPath}
                        fill="none"
                        stroke="#598636"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={usingTrackline ? undefined : '4 3'}
                      />
                      {waypointMarkers.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt[0]}
                          cy={pt[1]}
                          r={2.5}
                          fill="#ac6d46"
                          stroke="#ffffff"
                          strokeWidth={1}
                        />
                      ))}
                    </svg>
                  ) : waypointMarkers.length > 0 ? (
                    // Only 1 waypoint — render the single marker
                    <svg
                      viewBox="0 0 280 120"
                      className="w-full h-auto"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {waypointMarkers.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt[0]}
                          cy={pt[1]}
                          r={3}
                          fill="#ac6d46"
                          stroke="#ffffff"
                          strokeWidth={1}
                        />
                      ))}
                    </svg>
                  ) : (
                    <div className="text-center text-xs font-mono text-[#616161] dark:text-[#b5bcc4] py-6">
                      No preview geometry in this file.
                    </div>
                  )}
                </div>
              </div>

              {/* Editable waypoint list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold tracking-wide text-[#202020] dark:text-[#e5e5e5]">
                    WAYPOINTS ({editableWaypoints.length})
                  </div>
                  <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] font-mono">
                    Edit titles + descriptions, then APPLY
                  </div>
                </div>
                <div className="border-2 border-[#b5bcc4] dark:border-[#616161] max-h-80 overflow-y-auto">
                  {editableWaypoints.map((w, i) => (
                    <div
                      key={i}
                      className="border-b border-[#e5e5e5] dark:border-[#3a3a3a] last:border-b-0 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-[#616161] dark:text-[#b5bcc4]">
                          <span className="bg-[#ac6d46] text-white px-1.5 py-0.5 rounded-sm font-bold">
                            #{i + 1}
                          </span>
                          <span>
                            {w.lat.toFixed(5)}, {w.lon.toFixed(5)}
                            {w.elevationM != null
                              ? ` · ${Math.round(w.elevationM)} m`
                              : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteWaypoint(i)}
                          className="p-1 text-[#994040] hover:bg-[#994040]/10"
                          aria-label="Remove waypoint"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={w.title || ''}
                        onChange={(e) =>
                          handleWaypointFieldChange(i, 'title', e.target.value)
                        }
                        placeholder="Title (e.g. Trailhead, River crossing)"
                        maxLength={ROUTE_IMPORT_LIMITS.TITLE_MAX}
                        className="w-full px-2 py-1.5 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#598636] outline-none text-xs dark:text-[#e5e5e5]"
                      />
                      <textarea
                        value={w.description || ''}
                        onChange={(e) =>
                          handleWaypointFieldChange(
                            i,
                            'description',
                            e.target.value,
                          )
                        }
                        placeholder="Description (optional) — notes, hazards, directions…"
                        maxLength={descriptionMaxChars}
                        rows={2}
                        className="w-full px-2 py-1.5 bg-white dark:bg-[#2a2a2a] border border-[#b5bcc4] dark:border-[#616161] focus:border-[#598636] outline-none text-xs dark:text-[#e5e5e5] resize-y"
                      />
                      <div className="text-[10px] text-[#616161] dark:text-[#b5bcc4] font-mono text-right">
                        {(w.description || '').length}/{descriptionMaxChars.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Footer actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border-2 border-[#202020] dark:border-[#616161] text-[#202020] dark:text-[#e5e5e5] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-all text-xs font-bold"
            >
              CANCEL
            </button>
            {route && (
              <button
                onClick={handleApply}
                disabled={editableWaypoints.length === 0}
                className="flex-1 px-4 py-2.5 bg-[#598636] text-white hover:bg-[#4a702c] transition-all text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <FileText size={14} />
                APPLY IMPORT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-[#b5bcc4] dark:border-[#616161] px-2 py-2">
      <div className="text-[9px] text-[#616161] dark:text-[#b5bcc4] tracking-wider">
        {label}
      </div>
      <div className="text-sm font-bold text-[#202020] dark:text-[#e5e5e5]">
        {value}
      </div>
    </div>
  );
}

function computeBounds(coords: Position[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < minX) minX = lng;
    if (lng > maxX) maxX = lng;
    if (lat < minY) minY = lat;
    if (lat > maxY) maxY = lat;
  }
  if (!Number.isFinite(minX)) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
  }
  return { minX, maxX, minY, maxY };
}

function buildSvgPath(
  coords: Position[],
  width: number,
  height: number,
): string {
  const projected = projectPoints(coords, coords, width, height);
  if (projected.length === 0) return '';
  return projected
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`)
    .join(' ');
}

function projectPoints(
  points: Position[],
  bounds: Position[],
  width: number,
  height: number,
): Array<[number, number]> {
  if (points.length === 0) return [];
  const padding = 8;
  const { minX, maxX, minY, maxY } = computeBounds(bounds);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const scale = Math.min(w / rangeX, h / rangeY);
  const offsetX = padding + (w - rangeX * scale) / 2;
  const offsetY = padding + (h - rangeY * scale) / 2;
  return points.map(([lng, lat]) => {
    const x = offsetX + (lng - minX) * scale;
    // Invert Y so north is up
    const y = offsetY + (maxY - lat) * scale;
    return [x, y];
  });
}
