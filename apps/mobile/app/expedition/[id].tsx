import { useState, useEffect, useCallback, useMemo, useRef, ComponentType } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Share,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { api, ApiError, bookmarksApi } from '@/services/api';
import { MAPBOX_TOKEN } from '@/services/mapConfig';
import { colors as brandColors, mono, heading, borders } from '@/theme/tokens';
import { fmtAmount } from '@/utils/formatAmount';
import { Svg, Path, Line, Polyline, Circle, Rect } from 'react-native-svg';
import { NavBar } from '@/components/ui/NavBar';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { StatsBar } from '@/components/ui/StatsBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { HCard } from '@/components/ui/HCard';
import { Avatar } from '@/components/ui/Avatar';
import { EntryCardMini } from '@/components/cards/EntryCardMini';
import type { HeimuMapProps, WaypointMarker, WaypointType } from '@/components/map/HeimuMap';
import { clusterMarkers } from '@/components/map/HeimuMap';
import { TopoBackground } from '@/components/ui/TopoBackground';
import type { Entry as ApiEntry } from '@/types/api';

interface NoteReply {
  id: number;
  noteId: number;
  authorId: string;
  authorName: string;
  authorPicture?: string;
  isExplorer: boolean;
  text: string;
  timestamp: string;
}

interface ExpeditionNote {
  id: number;
  text: string;
  timestamp: string;
  expeditionStatus: 'PLANNING' | 'ACTIVE' | 'COMPLETE';
  replies: NoteReply[];
}

interface NotesResponse {
  notes: ExpeditionNote[];
  dailyLimit: { used: number; max: number };
}

interface ExpeditionSponsor {
  id: string;
  type: string;
  amount: number;
  status: string;
  message?: string;
  isPublic: boolean;
  isMessagePublic: boolean;
  createdAt?: string;
  user?: { username: string; name?: string; picture?: string };
  tier?: { id: string; description?: string; price: number };
}

interface ExpeditionWaypoint {
  id: number;
  lat: number;
  lon: number;
  title?: string;
  description?: string;
  date?: string;
  sequence?: number;
  entryId: string | null;
  entryIds: string[];
}

interface ExpeditionDetail {
  id: string;
  title: string;
  status: 'active' | 'planned' | 'completed' | 'cancelled';
  type?: string;
  category?: string;
  region?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  author?: { username: string; name?: string; picture?: string; creator?: boolean };
  raised?: number;
  goal?: number;
  sponsorsCount?: number;
  entriesCount?: number;
  waypointsCount?: number;
  entries?: ApiEntry[];
  sponsors?: ExpeditionSponsor[];
  waypoints?: ExpeditionWaypoint[];
  bookmarked?: boolean;
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  currentLocationVisibility?: 'public' | 'sponsors' | 'private';
  routeMode?: string;
  routeGeometry?: number[][];
  isRoundTrip?: boolean;
}

export default function ExpeditionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ApiEntry | null>(null);

  // Notes state
  const [noteCount, setNoteCount] = useState(0);
  const [notes, setNotes] = useState<ExpeditionNote[]>([]);
  const [dailyLimit, setDailyLimit] = useState<{ used: number; max: number }>({ used: 0, max: 1 });
  const [notesLocked, setNotesLocked] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  // Edit/delete state
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteText, setEditNoteText] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [mapZoom, setMapZoom] = useState(10); // conservative default — camera events will refine
  const mapZoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleZoomChange = useCallback((z: number) => {
    if (mapZoomTimerRef.current) clearTimeout(mapZoomTimerRef.current);
    mapZoomTimerRef.current = setTimeout(() => setMapZoom(z), 200);
  }, []);

  // Defer MapboxGL import to avoid blocking the JS thread
  const [MapComponent, setMapComponent] = useState<ComponentType<HeimuMapProps> | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/components/map/HeimuMap').then((mod) => setMapComponent(() => mod.default));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const { data: expedition, loading, error, refetch } = useApi<ExpeditionDetail>(`/trips/${id}`, { refetchOnFocus: true });

  useEffect(() => {
    if (expedition?.bookmarked != null) setBookmarked(expedition.bookmarked);
  }, [expedition?.bookmarked]);

  const handleShare = () => {
    Share.share({ url: `https://heimursaga.com/expedition/${id}` });
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }
    if (bookmarkLoading || !id) return;
    setBookmarkLoading(true);
    setBookmarked(prev => !prev);
    try {
      await bookmarksApi.toggleExpedition(id);
    } catch {
      setBookmarked(prev => !prev);
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Fetch notes when switching to Notes tab
  const fetchNotes = useCallback(async () => {
    if (!id) return;
    setNotesLoading(true);
    try {
      const countRes = await api.get<{ count: number }>(`/trips/${id}/notes/count`, { noAuth: true });
      setNoteCount(countRes.count);
    } catch { /* ignore */ }
    if (isAuthenticated) {
      try {
        const res = await api.get<NotesResponse>(`/trips/${id}/notes`);
        setNotes(res.notes);
        setDailyLimit(res.dailyLimit);
        setNotesLocked(false);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setNotesLocked(true);
        }
      }
    }
    setNotesLoading(false);
  }, [id, isAuthenticated]);

  useEffect(() => {
    if (activeTab === 1) fetchNotes();
  }, [activeTab, fetchNotes]);

  const isOwner = !!(user && expedition?.author && user.username === expedition.author.username);

  // Update location modal
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locSource, setLocSource] = useState<'waypoint' | 'entry'>('entry');
  const [locSelectedId, setLocSelectedId] = useState('');
  const [locVisibility, setLocVisibility] = useState<'public' | 'sponsors' | 'private'>('public');
  const [locSaving, setLocSaving] = useState(false);

  const openLocationModal = useCallback(() => {
    if (!expedition) return;
    setLocSource(expedition.currentLocationSource || 'entry');
    setLocSelectedId(expedition.currentLocationId || '');
    setLocVisibility(expedition.currentLocationVisibility || 'public');
    setLocationModalVisible(true);
  }, [expedition]);

  const handleSaveLocation = useCallback(async () => {
    if (!locSelectedId || !id) return;
    setLocSaving(true);
    try {
      await api.patch(`/trips/${id}/location`, {
        source: locSource,
        locationId: locSelectedId,
        visibility: locVisibility,
      });
      setLocationModalVisible(false);
      await refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update location';
      Alert.alert('Error', msg);
    } finally {
      setLocSaving(false);
    }
  }, [id, locSource, locSelectedId, locVisibility, refetch]);

  // Build location picker items
  const geoWaypoints = (expedition?.waypoints ?? []).filter(w => w.lat != null && w.lon != null);
  const geoEntriesForPicker = (expedition?.entries ?? []).filter(e => e.lat != null && e.lon != null);

  const handlePostNote = async () => {
    if (!noteText.trim() || noteSubmitting) return;
    setNoteSubmitting(true);
    try {
      await api.post(`/trips/${id}/notes`, { text: noteText.trim() });
      setNoteText('');
      setShowNoteForm(false);
      await fetchNotes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post note';
      Alert.alert('Error', msg);
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handlePostReply = async (noteId: number) => {
    if (!replyText.trim() || replySubmitting) return;
    setReplySubmitting(true);
    try {
      await api.post(`/trips/${id}/notes/${noteId}/replies`, { text: replyText.trim() });
      setReplyText('');
      setReplyingTo(null);
      await fetchNotes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to post reply';
      Alert.alert('Error', msg);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleEditNote = async (noteId: number, text: string) => {
    setEditSaving(true);
    try {
      await api.patch(`/trips/${id}/notes/${noteId}`, { text });
      setEditingNoteId(null);
      setEditNoteText('');
      await fetchNotes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to edit note';
      Alert.alert('Error', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteNote = (noteId: number) => {
    Alert.alert('Delete Note', 'Delete this note and all its responses?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/trips/${id}/notes/${noteId}`);
            await fetchNotes();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete note';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const handleEditReply = async (noteId: number, replyId: number, text: string) => {
    setEditSaving(true);
    try {
      await api.patch(`/trips/${id}/notes/${noteId}/replies/${replyId}`, { text });
      setEditingReplyId(null);
      setEditReplyText('');
      await fetchNotes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to edit reply';
      Alert.alert('Error', msg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteReply = (noteId: number, replyId: number) => {
    Alert.alert('Delete Response', 'Delete this response?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/trips/${id}/notes/${noteId}/replies/${replyId}`);
            await fetchNotes();
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete reply';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  // Merge all markers — must run before early returns to satisfy rules of hooks
  const allMarkers = useMemo<WaypointMarker[]>(() => {
    if (!expedition) return [];

    const sortedWps = [...(expedition.waypoints ?? [])]
      .filter(w => w.lat != null && w.lon != null)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const geoEntrs = (expedition.entries ?? []).filter(e => e.lat != null && e.lon != null);

    const linkedIds = new Set<string>();
    sortedWps.forEach(w => (w.entryIds ?? []).forEach(eid => linkedIds.add(eid)));

    const wpMarkers: WaypointMarker[] = sortedWps.map((w, i, arr) => {
      const isStart = i === 0;
      const isEnd = i === arr.length - 1 && arr.length > 1;
      const hasEntries = (w.entryIds ?? []).length > 0;
      const entryCount = (w.entryIds ?? []).length;
      let type: WaypointType;
      if (isStart) type = 'origin';
      else if (isEnd) type = 'destination';
      else type = hasEntries ? 'entry' : 'waypoint';
      return {
        coordinates: [w.lon, w.lat] as [number, number],
        type,
        label: w.title ?? undefined,
        text: isStart ? 'S' : isEnd ? 'E' : entryCount > 1 ? String(entryCount) : String(i + 1),
        entryIds: w.entryIds ?? [],
      };
    });

    const legEntries = geoEntrs.filter(e => !linkedIds.has(e.id));
    const entMarkers: WaypointMarker[] = legEntries.map((e, i) => ({
      coordinates: [e.lon!, e.lat!] as [number, number],
      type: 'entry' as WaypointType,
      label: e.place,
      text: String(i + 1),
      entryIds: [e.id],
    }));

    let markers: WaypointMarker[];
    if (wpMarkers.length > 0) {
      markers = [...wpMarkers, ...entMarkers];
    } else {
      markers = entMarkers.map((m, i, arr) => ({
        ...m,
        type: (i === 0 ? 'origin' : i === arr.length - 1 ? 'destination' : 'entry') as WaypointType,
        text: i === 0 ? 'S' : i === arr.length - 1 && arr.length > 1 ? 'E' : String(i + 1),
      }));
    }

    const src = expedition.currentLocationSource;
    const locId = expedition.currentLocationId;
    let curCoords: [number, number] | null = null;
    if (src === 'waypoint' && locId) {
      const wp = (expedition.waypoints ?? []).find(w => String(w.id) === locId);
      if (wp) curCoords = [wp.lon, wp.lat];
    }
    if (!curCoords && src === 'entry' && locId) {
      const entry = (expedition.entries ?? []).find(e => e.id === locId);
      if (entry?.lat != null) curCoords = [entry.lon!, entry.lat];
    }

    if (curCoords) {
      let matched = false;
      markers = markers.map(m => {
        if (!matched && m.coordinates[0] === curCoords![0] && m.coordinates[1] === curCoords![1]) {
          matched = true;
          return { ...m, isCurrent: true };
        }
        return m;
      });
      if (!matched) {
        markers.push({ coordinates: curCoords, type: 'current', label: 'Current Location', isCurrent: true });
      }
    }

    return clusterMarkers(markers, mapZoom);
  }, [expedition, mapZoom]);

  // Fetch directions on-demand when routeMode is set but routeGeometry is missing
  const [fetchedDirections, setFetchedDirections] = useState<[number, number][] | null>(null);
  const needsDirectionsFetch = expedition
    && !(expedition.routeGeometry && expedition.routeGeometry.length > 0)
    && expedition.routeMode
    && expedition.routeMode !== 'straight'
    && (expedition.waypoints ?? []).filter(w => w.lat != null && w.lon != null).length >= 2;

  useEffect(() => {
    if (!needsDirectionsFetch || !expedition) return;
    let cancelled = false;
    const wps = [...(expedition.waypoints ?? [])]
      .filter(w => w.lat != null && w.lon != null)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
    const coords = wps.map(w => [w.lon, w.lat] as [number, number]);
    if (expedition.isRoundTrip && coords.length > 1) coords.push(coords[0]);
    const coordStr = coords.map(c => `${c[0].toFixed(6)},${c[1].toFixed(6)}`).join(';');
    fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${expedition.routeMode}/${coordStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`,
    )
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.code === 'Ok' && data.routes?.[0]) {
          setFetchedDirections(data.routes[0].geometry.coordinates);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [needsDirectionsFetch, expedition]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} />
        <View style={styles.centered}>
          <ActivityIndicator color={brandColors.copper} size="large" />
        </View>
      </View>
    );
  }

  if (error || !expedition) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} />
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textTertiary }]}>
            Could not load expedition
          </Text>
        </View>
      </View>
    );
  }

  const statusLabel = `${expedition.status.toUpperCase()} EXPEDITION`;
  const statusRight = expedition.category?.toUpperCase();

  // ── Map data ──────────────────────────────────────────────────────────────
  // Waypoints form the route; entries are additional markers
  const sortedWaypoints = [...(expedition.waypoints ?? [])]
    .filter(w => w.lat != null && w.lon != null)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const geoEntries = (expedition.entries ?? []).filter(e => e.lat != null && e.lon != null);

  // Route polyline: use saved directions geometry, fetch on-demand, or straight lines
  const straightCoords: [number, number][] = sortedWaypoints.length > 0
    ? sortedWaypoints.map(w => [w.lon, w.lat])
    : geoEntries.map(e => [e.lon!, e.lat!]);

  const hasDirectionsRoute = expedition.routeGeometry && expedition.routeGeometry.length > 0;

  const routeCoords: [number, number][] = hasDirectionsRoute
    ? (expedition.routeGeometry as [number, number][])
    : fetchedDirections ?? straightCoords;

  // Bounds include both waypoints and entries
  const allCoords = [
    ...sortedWaypoints.map(w => ({ lon: w.lon, lat: w.lat })),
    ...geoEntries.map(e => ({ lon: e.lon!, lat: e.lat! })),
  ];
  const mapBounds = allCoords.length > 0
    ? {
        ne: [
          Math.max(...allCoords.map(c => c.lon)),
          Math.max(...allCoords.map(c => c.lat)),
        ] as [number, number],
        sw: [
          Math.min(...allCoords.map(c => c.lon)),
          Math.min(...allCoords.map(c => c.lat)),
        ] as [number, number],
      }
    : undefined;

  // ── Current location ────────────────────────────────────────────────────
  const currentLoc = (() => {
    const src = expedition.currentLocationSource;
    const locId = expedition.currentLocationId;
    if (src === 'waypoint' && locId) {
      const wp = (expedition.waypoints ?? []).find(w => String(w.id) === locId);
      if (wp) return { place: wp.title ?? 'Current Location', lat: wp.lat, lon: wp.lon };
    }
    if (src === 'entry' && locId) {
      const entry = (expedition.entries ?? []).find(e => e.id === locId);
      if (entry) return { place: entry.place ?? entry.title, lat: entry.lat, lon: entry.lon };
    }
    // Fallback: most recent entry
    const latest = geoEntries[0];
    if (latest) return { place: latest.place ?? 'En Route', lat: latest.lat, lon: latest.lon };
    return null;
  })();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopoBackground topOffset={53} />
      {/* Fullscreen map modal */}
      {mapExpanded && (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 50, backgroundColor: '#000' }]}>
          {MapComponent && (
            <MapComponent
              style={StyleSheet.absoluteFillObject}
              bounds={mapBounds}
              center={[-98, 40]}
              zoom={2}
              routeCoords={routeCoords.length > 1 ? routeCoords : undefined}
              waypoints={allMarkers}
              interactive
              onZoomChange={handleZoomChange}
              onWaypointPress={(i) => {
                const marker = allMarkers[i];
                if (!marker?.entryIds?.length) return;
                const eid = marker.entryIds[0];
                const entry = (expedition.entries ?? []).find(e => e.id === eid);
                if (entry) setSelectedEntry(entry);
              }}
            />
          )}
          {/* Top bar: title + close */}
          <SafeAreaView style={styles.fullMapHeader} edges={['top']}>
            <Text style={styles.fullMapTitle} numberOfLines={1}>{expedition.title}</Text>
            <Pressable
              style={styles.fullMapCloseBtn}
              onPress={() => { setMapExpanded(false); setSelectedEntry(null); }}
            >
              <Text style={styles.fullMapCloseText}>CLOSE</Text>
            </Pressable>
          </SafeAreaView>
          {/* Entry popup — positioned below header */}
          {selectedEntry && (
            <SafeAreaView style={styles.popupSafeWrap} edges={['top']} pointerEvents="box-none">
              <View style={[styles.popupWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.popupHeader}>
                  <Text style={[styles.popupTitle, { color: colors.text }]} numberOfLines={1}>
                    {selectedEntry.title}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedEntry(null)} hitSlop={8}>
                    <Text style={[styles.popupClose, { color: colors.textTertiary }]}>✕</Text>
                  </TouchableOpacity>
                </View>
                {selectedEntry.place && (
                  <Text style={[styles.popupPlace, { color: colors.textSecondary }]} numberOfLines={1}>
                    {selectedEntry.place}
                  </Text>
                )}
                {selectedEntry.date && (
                  <Text style={[styles.popupDate, { color: colors.textTertiary }]}>
                    {new Date(selectedEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.popupBtn}
                  onPress={() => { setSelectedEntry(null); router.push(`/entry/${selectedEntry.id}`); }}
                >
                  <Text style={styles.popupBtnText}>VIEW ENTRY</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          )}
          {/* Map legend */}
          <View style={[styles.mapLegend, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.mapLegendTitle, { color: colors.text }]}>MAP LEGEND</Text>
            <View style={styles.mapLegendItems}>
              <View style={styles.mapLegendItem}>
                <View style={styles.mapLegendDotWrap}>
                  <View style={[styles.mapLegendDot, { backgroundColor: brandColors.copper, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#fff' }]}>
                    <Text style={styles.mapLegendDotText}>S</Text>
                  </View>
                </View>
                <Text style={[styles.mapLegendText, { color: colors.textSecondary }]}>Start</Text>
              </View>
              <View style={styles.mapLegendItem}>
                <View style={styles.mapLegendDotWrap}>
                  <View style={[styles.mapLegendDot, { backgroundColor: brandColors.blue, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#fff' }]}>
                    <Text style={styles.mapLegendDotText}>E</Text>
                  </View>
                </View>
                <Text style={[styles.mapLegendText, { color: colors.textSecondary }]}>End</Text>
              </View>
              <View style={styles.mapLegendItem}>
                <View style={styles.mapLegendDotWrap}>
                  <View style={[styles.mapLegendDot, { backgroundColor: '#616161', width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' }]}>
                    <Text style={[styles.mapLegendDotText, { fontSize: 8 }]}>1</Text>
                  </View>
                </View>
                <Text style={[styles.mapLegendText, { color: colors.textSecondary }]}>Waypoint</Text>
              </View>
              <View style={styles.mapLegendItem}>
                <View style={styles.mapLegendDotWrap}>
                  <View style={[styles.mapLegendDot, { backgroundColor: brandColors.copper, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' }]}>
                    <Text style={[styles.mapLegendDotText, { fontSize: 8 }]}>1</Text>
                  </View>
                </View>
                <Text style={[styles.mapLegendText, { color: colors.textSecondary }]}>Journal Entry</Text>
              </View>
              <View style={styles.mapLegendItem}>
                <View style={styles.mapLegendDotWrap}>
                  <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' }} />
                    <View style={[styles.mapLegendDot, { backgroundColor: '#616161', width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: '#fff' }]} />
                  </View>
                </View>
                <Text style={[styles.mapLegendText, { color: colors.textSecondary }]}>Current Location</Text>
              </View>
              <View style={[styles.mapLegendSep, { borderTopColor: colors.borderThin }]} />
              <View style={styles.mapLegendItem}>
                <View style={styles.mapLegendDotWrap}>
                  <View style={{ width: 18, height: 3, backgroundColor: brandColors.copper, borderRadius: 1 }} />
                </View>
                <Text style={[styles.mapLegendText, { color: colors.textSecondary }]}>Route</Text>
              </View>
            </View>
          </View>

          {/* Bottom: current location bar */}
          <SafeAreaView style={styles.fullMapBottom} edges={['bottom']}>
            <View style={styles.currentLocRow}>
              <View style={styles.currentLocLeft}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
                  <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <Circle cx={12} cy={10} r={3} />
                </Svg>
                <Text style={styles.currentlyLabel}>CURRENTLY</Text>
                <Text style={styles.currentlyCity}>{currentLoc?.place ?? 'En Route'}</Text>
              </View>
              <Text style={styles.currentlyCoords}>
                {currentLoc?.lat != null ? `${Math.abs(currentLoc.lat).toFixed(2)}${currentLoc.lat >= 0 ? 'N' : 'S'} / ${Math.abs(currentLoc.lon!).toFixed(2)}${currentLoc.lon! >= 0 ? 'E' : 'W'}` : ''}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <NavBar onBack={() => router.back()} />

        {/* Status */}
        <StatusHeader status={expedition.status} label={statusLabel} right={statusRight} variant="detail" />

        {/* Map hero area (banner) */}
        <View style={styles.mapArea}>
          {MapComponent && (
            <MapComponent
              style={StyleSheet.absoluteFillObject}
              bounds={mapBounds ? { ...mapBounds, padding: 40 } : undefined}
              center={[-98, 40]}
              zoom={2}
              routeCoords={routeCoords.length > 1 ? routeCoords : undefined}
              waypoints={allMarkers}
              interactive={false}
            />
          )}
          <View style={styles.mapOverlay}>
            {/* Title + dates + expand */}
            <View style={styles.mapTop}>
              <View style={styles.mapTopRow}>
                <Text style={[styles.heroTitle, { flex: 1 }]}>{expedition.title}</Text>
                <Pressable
                  style={styles.viewMapBtn}
                  onPress={() => setMapExpanded(true)}
                >
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2}>
                    <Path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                  </Svg>
                  <Text style={styles.viewMapText}>EXPAND</Text>
                </Pressable>
              </View>
              {expedition.startDate && (
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>
                    {new Date(expedition.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={styles.dateArrow}>{'\u2192'}</Text>
                  <Text style={styles.dateText}>
                    {expedition.endDate
                      ? new Date(expedition.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Ongoing'}
                  </Text>
                </View>
              )}
              {expedition.region && (
                <Text style={styles.heroMeta}>
                  {expedition.region.toUpperCase()}
                </Text>
              )}
            </View>

            {/* Spacer pushes bottom content down */}
            <View style={{ flex: 1 }} />

            {/* Explorer info */}
            {expedition.author && (
              <Pressable
                onPress={() => router.push(`/explorer/${expedition.author!.username}`)}
                style={styles.explorerRow}
              >
                <Avatar size={32} name={expedition.author.username} imageUrl={expedition.author.picture} pro={expedition.author.creator} />
                <View style={styles.explorerTextWrap}>
                  <Text style={styles.explorerName}>
                    {expedition.author.username}
                  </Text>
                  {expedition.description && (
                    <Text style={styles.explorerBio} numberOfLines={2}>
                      {expedition.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            )}

            {/* Current location */}
            <Pressable
              style={styles.currentLocRow}
              onPress={isOwner ? openLocationModal : undefined}
            >
              <View style={styles.currentLocLeft}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
                  <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <Circle cx={12} cy={10} r={3} />
                </Svg>
                <Text style={styles.currentlyLabel}>CURRENTLY</Text>
                <Text style={styles.currentlyCity}>{currentLoc?.place ?? 'En Route'}</Text>
              </View>
              <Text style={styles.currentlyCoords}>
                {currentLoc?.lat != null ? `${Math.abs(currentLoc.lat).toFixed(2)}${currentLoc.lat >= 0 ? 'N' : 'S'} / ${Math.abs(currentLoc.lon!).toFixed(2)}${currentLoc.lon! >= 0 ? 'E' : 'W'}` : ''}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Stats bar */}
        <View style={[styles.statsWrapper, { borderColor: colors.border }]}>
          <StatsBar
            stats={[
              {
                value: fmtAmount(expedition.raised ?? 0),
                suffix: (expedition.goal ?? 0) > 0 ? `/${fmtAmount(expedition.goal!)}` : undefined,
                label: 'RAISED',
              },
              { value: String(expedition.sponsorsCount ?? 0), label: 'SPONSORS' },
              { value: String(expedition.entriesCount ?? 0), label: 'ENTRIES' },
            ]}
          />
        </View>

        {/* Action bar */}
        <View style={[styles.actionBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable
            style={[styles.actionBtn, { borderRightWidth: 1, borderRightColor: colors.borderThin }]}
            onPress={() => isOwner
              ? router.navigate({ pathname: '/(tabs)/create', params: { expeditionId: id } })
              : router.push(`/sponsor/${id}`)
            }
          >
            <Text style={[styles.actionText, { color: brandColors.copper }]}>{isOwner ? 'LOG ENTRY' : 'SPONSOR'}</Text>
          </Pressable>
          {isOwner && (
            <Pressable style={styles.iconBtn} onPress={() => router.push(`/expedition/edit/${id}`)}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </Svg>
            </Pressable>
          )}
          <Pressable style={styles.iconBtn} onPress={handleShare}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
              <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <Polyline points="16 6 12 2 8 6" />
              <Line x1={12} y1={2} x2={12} y2={15} />
            </Svg>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleBookmark}>
            <Svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill={bookmarked ? brandColors.copper : 'none'}
              stroke={bookmarked ? brandColors.copper : colors.textTertiary}
              strokeWidth={2}
            >
              <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </Svg>
          </Pressable>
        </View>

        {/* Content tabs */}
        <View style={{ paddingHorizontal: 16, marginTop: 12, marginBottom: 4 }}>
          <SegmentedControl
            options={['ENTRIES', 'NOTES', 'SPONSORS', 'WPTS']}
            active={activeTab}
            onSelect={setActiveTab}
          />
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 0 && (
            (expedition.entries ?? []).length === 0 ? (
              <View style={styles.emptyEntries}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No entries yet
                </Text>
              </View>
            ) : (
              expedition.entries?.map((entry) => (
                <EntryCardMini
                  key={entry.id}
                  entry={entry}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                  showAuthor={false}
                />
              ))
            )
          )}

          {activeTab === 1 && (
            notesLoading ? (
              <View style={styles.emptyEntries}>
                <ActivityIndicator color={brandColors.copper} />
              </View>
            ) : notesLocked ? (
              /* Locked state */
              <View style={[styles.notesLockedCard, { borderColor: colors.border }]}>
                <View style={styles.notesLockedHeader}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.5}>
                    <Rect x={3} y={11} width={18} height={11} rx={2} />
                    <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </Svg>
                  <Text style={styles.notesLockedTitle}>EXPEDITION NOTES</Text>
                </View>
                <Text style={styles.notesLockedSub}>SPONSOR EXCLUSIVE CONTENT</Text>
                <Text style={styles.notesLockedCount}>
                  {noteCount} {noteCount === 1 ? 'NOTE' : 'NOTES'} LOGGED
                </Text>
                <Text style={[styles.notesLockedDesc, { color: colors.textSecondary }]}>
                  Behind-the-scenes updates from {expedition.author?.name || expedition.author?.username || 'the explorer'} during this expedition.
                </Text>
                <TouchableOpacity
                  style={styles.notesLockedBtn}
                  onPress={() => router.push(`/sponsor/${id}`)}
                >
                  <Text style={styles.notesLockedBtnText}>SPONSOR TO UNLOCK</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Unlocked state */
              <>
                {/* Header */}
                <View style={styles.notesHeader}>
                  <View>
                    <Text style={styles.notesHeaderTitle}>EXPEDITION NOTES</Text>
                    <Text style={styles.notesHeaderSub}>
                      {notes.length} {notes.length === 1 ? 'NOTE' : 'NOTES'} LOGGED • SPONSOR EXCLUSIVE
                    </Text>
                  </View>
                  {isOwner && dailyLimit.used < dailyLimit.max && (
                    <TouchableOpacity
                      style={styles.logNoteBtn}
                      onPress={() => setShowNoteForm(!showNoteForm)}
                    >
                      <Text style={styles.logNoteBtnText}>{showNoteForm ? 'CANCEL' : '+ LOG NOTE'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Note form */}
                {showNoteForm && (
                  <View style={[styles.noteFormCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.noteFormLabel, { color: colors.textTertiary }]}>
                      LOGGING AS: {user?.username} • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <TextInput
                      style={[styles.noteFormInput, { color: colors.text, borderColor: colors.border }]}
                      value={noteText}
                      onChangeText={setNoteText}
                      placeholder="Share a quick update with your sponsors..."
                      placeholderTextColor={colors.textTertiary}
                      maxLength={280}
                      multiline
                    />
                    <View style={styles.noteFormFooter}>
                      <Text style={[styles.noteFormCount, { color: noteText.length > 250 ? brandColors.red : colors.textTertiary }]}>
                        {noteText.length}/280
                      </Text>
                      <TouchableOpacity
                        style={[styles.noteFormSubmit, { opacity: noteText.trim() ? 1 : 0.5 }]}
                        onPress={handlePostNote}
                        disabled={!noteText.trim() || noteSubmitting}
                      >
                        <Text style={styles.noteFormSubmitText}>
                          {noteSubmitting ? 'POSTING...' : 'LOG NOTE'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Notes list */}
                {notes.length === 0 ? (
                  <View style={[styles.emptyEntries, { borderWidth: borders.thick, borderColor: colors.border, borderStyle: 'dashed' }]}>
                    <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                      No notes logged yet
                    </Text>
                  </View>
                ) : (
                  notes.map((note, idx) => (
                    <View key={note.id} style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {/* Note header */}
                      <View style={styles.noteCardHeader}>
                        <View style={styles.noteCardBadge}>
                          <Text style={styles.noteCardBadgeText}>NOTE #{notes.length - idx}</Text>
                        </View>
                        <View style={[styles.noteStatusBadge, {
                          backgroundColor: note.expeditionStatus === 'ACTIVE' ? brandColors.green
                            : note.expeditionStatus === 'COMPLETE' ? brandColors.blue
                            : brandColors.darkGray ?? '#616161',
                        }]}>
                          <Text style={styles.noteStatusText}>{note.expeditionStatus}</Text>
                        </View>
                        <Text style={[styles.noteTimestamp, { color: colors.textTertiary }]}>
                          {new Date(note.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>

                      {/* Owner actions */}
                      {isOwner && editingNoteId !== note.id && (
                        <View style={styles.noteActions}>
                          <TouchableOpacity onPress={() => { setEditingNoteId(note.id); setEditNoteText(note.text); }}>
                            <Text style={[styles.noteActionText, { color: brandColors.blue }]}>EDIT</Text>
                          </TouchableOpacity>
                          <Text style={{ color: colors.textTertiary }}>|</Text>
                          <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                            <Text style={[styles.noteActionText, { color: brandColors.red }]}>DELETE</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Note text or edit form */}
                      {editingNoteId === note.id ? (
                        <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
                          <TextInput
                            style={[styles.noteFormInput, { color: colors.text, borderColor: brandColors.blue }]}
                            value={editNoteText}
                            onChangeText={setEditNoteText}
                            maxLength={280}
                            multiline
                          />
                          <View style={styles.noteFormFooter}>
                            <Text style={[styles.noteFormCount, { color: editNoteText.length > 250 ? brandColors.red : colors.textTertiary }]}>
                              {editNoteText.length}/280
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity
                                style={[styles.noteFormSubmit, { backgroundColor: brandColors.blue, opacity: editNoteText.trim() && editNoteText !== note.text ? 1 : 0.5 }]}
                                onPress={() => handleEditNote(note.id, editNoteText.trim())}
                                disabled={!editNoteText.trim() || editNoteText === note.text || editSaving}
                              >
                                <Text style={styles.noteFormSubmitText}>{editSaving ? 'SAVING...' : 'SAVE'}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => { setEditingNoteId(null); setEditNoteText(''); }}>
                                <Text style={[styles.noteActionText, { color: colors.textTertiary, paddingVertical: 8 }]}>CANCEL</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.noteText, { color: colors.text }]}>{note.text}</Text>
                      )}

                      {/* Respond button */}
                      {isAuthenticated && !notesLocked && editingNoteId !== note.id && (
                        <TouchableOpacity
                          style={styles.noteRespondBtn}
                          onPress={() => { setReplyingTo(replyingTo === note.id ? null : note.id); setReplyText(''); }}
                        >
                          <Text style={[styles.noteRespondText, { color: brandColors.copper }]}>
                            {replyingTo === note.id ? 'CANCEL' : '\u21B3 RESPOND'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Reply form */}
                      {replyingTo === note.id && (
                        <View style={[styles.replyFormWrap, { borderColor: colors.border }]}>
                          <TextInput
                            style={[styles.noteFormInput, { color: colors.text, borderColor: colors.border }]}
                            value={replyText}
                            onChangeText={setReplyText}
                            placeholder="Write a response..."
                            placeholderTextColor={colors.textTertiary}
                            maxLength={280}
                            multiline
                          />
                          <View style={styles.noteFormFooter}>
                            <Text style={[styles.noteFormCount, { color: replyText.length > 250 ? brandColors.red : colors.textTertiary }]}>
                              {replyText.length}/280
                            </Text>
                            <TouchableOpacity
                              style={[styles.noteFormSubmit, { opacity: replyText.trim() ? 1 : 0.5 }]}
                              onPress={() => handlePostReply(note.id)}
                              disabled={!replyText.trim() || replySubmitting}
                            >
                              <Text style={styles.noteFormSubmitText}>
                                {replySubmitting ? 'POSTING...' : 'LOG RESPONSE'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Replies */}
                      {note.replies.length > 0 && (
                        <View style={[styles.repliesWrap, { borderTopColor: colors.border }]}>
                          <Text style={[styles.repliesCount, { color: colors.textTertiary }]}>
                            {note.replies.length} {note.replies.length === 1 ? 'RESPONSE' : 'RESPONSES'}
                          </Text>
                          {note.replies.map((reply) => {
                            const isReplyAuthor = user?.username === reply.authorId;
                            const canEditReply = isReplyAuthor;
                            const canDeleteReply = isReplyAuthor || isOwner;

                            return (
                            <View key={reply.id} style={styles.replyRow}>
                              <Avatar size={24} name={reply.authorName} imageUrl={reply.authorPicture} />
                              <View style={styles.replyContent}>
                                <View style={styles.replyHeader}>
                                  <Text style={[styles.replyAuthor, { color: colors.text }]}>{reply.authorId}</Text>
                                  {reply.isExplorer && (
                                    <View style={styles.explorerBadge}>
                                      <Text style={styles.explorerBadgeText}>EXPLORER</Text>
                                    </View>
                                  )}
                                  <Text style={[styles.replyDate, { color: colors.textTertiary }]}>
                                    {new Date(reply.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </Text>
                                </View>

                                {/* Reply edit form or text */}
                                {editingReplyId === reply.id ? (
                                  <View style={{ marginTop: 4 }}>
                                    <TextInput
                                      style={[styles.noteFormInput, { color: colors.text, borderColor: brandColors.blue, minHeight: 50, fontSize: 13 }]}
                                      value={editReplyText}
                                      onChangeText={setEditReplyText}
                                      maxLength={280}
                                      multiline
                                    />
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                      <Text style={[styles.noteFormCount, { color: editReplyText.length > 250 ? brandColors.red : colors.textTertiary }]}>
                                        {editReplyText.length}/280
                                      </Text>
                                      <TouchableOpacity
                                        style={[styles.noteFormSubmit, { backgroundColor: brandColors.blue, opacity: editReplyText.trim() && editReplyText !== reply.text ? 1 : 0.5, paddingVertical: 4, paddingHorizontal: 10 }]}
                                        onPress={() => handleEditReply(note.id, reply.id, editReplyText.trim())}
                                        disabled={!editReplyText.trim() || editReplyText === reply.text || editSaving}
                                      >
                                        <Text style={[styles.noteFormSubmitText, { fontSize: 10 }]}>{editSaving ? '...' : 'SAVE'}</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={() => { setEditingReplyId(null); setEditReplyText(''); }}>
                                        <Text style={[styles.noteActionText, { color: colors.textTertiary }]}>CANCEL</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                ) : (
                                  <>
                                    <Text style={[styles.replyText, { color: colors.textSecondary }]}>{reply.text}</Text>
                                    {(canEditReply || canDeleteReply) && (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                        {canEditReply && (
                                          <TouchableOpacity onPress={() => { setEditingReplyId(reply.id); setEditReplyText(reply.text); }}>
                                            <Text style={[styles.noteActionText, { color: brandColors.blue, fontSize: 10 }]}>EDIT</Text>
                                          </TouchableOpacity>
                                        )}
                                        {canEditReply && canDeleteReply && (
                                          <Text style={{ color: colors.textTertiary, fontSize: 10 }}>|</Text>
                                        )}
                                        {canDeleteReply && (
                                          <TouchableOpacity onPress={() => handleDeleteReply(note.id, reply.id)}>
                                            <Text style={[styles.noteActionText, { color: brandColors.red, fontSize: 10 }]}>DELETE</Text>
                                          </TouchableOpacity>
                                        )}
                                      </View>
                                    )}
                                  </>
                                )}
                              </View>
                            </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  ))
                )}
              </>
            )
          )}

          {activeTab === 2 && (
            (expedition.sponsors ?? []).length === 0 ? (
              <View style={styles.emptyEntries}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No sponsors yet
                </Text>
              </View>
            ) : (
              expedition.sponsors?.map((sponsor) => (
                <Pressable
                  key={sponsor.id}
                  style={[styles.sponsorCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={sponsor.user ? () => router.push(`/explorer/${sponsor.user!.username}`) : undefined}
                >
                  <Avatar
                    size={36}
                    name={sponsor.isPublic && sponsor.user ? sponsor.user.username : '?'}
                    imageUrl={sponsor.isPublic ? sponsor.user?.picture : undefined}
                  />
                  <View style={styles.sponsorInfo}>
                    <Text style={[styles.sponsorName, { color: colors.text }]}>
                      {sponsor.isPublic && sponsor.user
                        ? sponsor.user.username
                        : 'Anonymous'}
                    </Text>
                    <View style={styles.sponsorMeta}>
                      <Text style={[styles.sponsorAmount, { color: brandColors.copper }]}>
                        ${sponsor.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Text>
                      <Text style={[styles.sponsorType, { color: colors.textTertiary }]}>
                        {sponsor.type === 'subscription' ? 'MONTHLY' : 'ONE-TIME'}
                      </Text>
                    </View>
                    {sponsor.isMessagePublic && sponsor.message && (
                      <Text style={[styles.sponsorMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                        "{sponsor.message}"
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))
            )
          )}

          {activeTab === 3 && (
            (expedition.waypoints ?? []).length === 0 ? (
              <View style={styles.emptyEntries}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No waypoints yet
                </Text>
              </View>
            ) : (
              expedition.waypoints?.map((wp, i) => (
                <View
                  key={wp.id}
                  style={[styles.waypointCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.waypointSeq, {
                    backgroundColor: i === 0 ? brandColors.blue : i === (expedition.waypoints!.length - 1) ? brandColors.green : brandColors.copper,
                  }]}>
                    <Text style={styles.waypointSeqText}>{wp.sequence ?? i + 1}</Text>
                  </View>
                  <View style={styles.waypointInfo}>
                    <Text style={[styles.waypointTitle, { color: colors.text }]}>
                      {wp.title || `Waypoint ${wp.sequence ?? i + 1}`}
                    </Text>
                    <View style={styles.waypointMeta}>
                      <Text style={[styles.waypointCoords, { color: colors.textTertiary }]}>
                        {Math.abs(wp.lat).toFixed(2)}{wp.lat >= 0 ? 'N' : 'S'} / {Math.abs(wp.lon).toFixed(2)}{wp.lon >= 0 ? 'E' : 'W'}
                      </Text>
                      {wp.date && (
                        <Text style={[styles.waypointDate, { color: colors.textTertiary }]}>
                          {new Date(wp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      )}
                    </View>
                    {wp.description && (
                      <Text style={[styles.waypointDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {wp.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))
            )
          )}
        </View>
      </ScrollView>

      {/* Update Location Modal */}
      <Modal visible={locationModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.5}>
                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <Circle cx={12} cy={10} r={3} />
              </Svg>
              <View>
                <Text style={styles.modalTitle}>UPDATE LOCATION</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{expedition.title}</Text>
              </View>
            </View>
            <Pressable onPress={() => setLocationModalVisible(false)} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>CLOSE</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalBody}>
              {/* Info */}
              <View style={[styles.locInfoBox, { borderLeftColor: brandColors.blue }]}>
                <Text style={[styles.locInfoTitle, { color: colors.text }]}>QUICK LOCATION UPDATE</Text>
                <Text style={[styles.locInfoDesc, { color: colors.textSecondary }]}>
                  Select a waypoint or journal entry to set as your current location on the map.
                </Text>
              </View>

              {/* Source toggle */}
              <Text style={[styles.locSectionLabel, { color: colors.text }]}>SELECT SOURCE</Text>
              <View style={styles.locSourceRow}>
                <Pressable
                  style={[
                    styles.locSourceBtn,
                    {
                      borderColor: locSource === 'entry' ? brandColors.copper : colors.border,
                      backgroundColor: locSource === 'entry' ? `${brandColors.copper}18` : colors.card,
                    },
                  ]}
                  onPress={() => { setLocSource('entry'); setLocSelectedId(''); }}
                >
                  <Text style={[styles.locSourceLabel, { color: locSource === 'entry' ? brandColors.copper : colors.text }]}>
                    ENTRIES
                  </Text>
                  <Text style={[styles.locSourceCount, { color: colors.textTertiary }]}>
                    {geoEntriesForPicker.length}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.locSourceBtn,
                    {
                      borderColor: locSource === 'waypoint' ? brandColors.blue : colors.border,
                      backgroundColor: locSource === 'waypoint' ? `${brandColors.blue}18` : colors.card,
                    },
                  ]}
                  onPress={() => { setLocSource('waypoint'); setLocSelectedId(''); }}
                >
                  <Text style={[styles.locSourceLabel, { color: locSource === 'waypoint' ? brandColors.blue : colors.text }]}>
                    WAYPOINTS
                  </Text>
                  <Text style={[styles.locSourceCount, { color: colors.textTertiary }]}>
                    {geoWaypoints.length}
                  </Text>
                </Pressable>
              </View>

              {/* Location list */}
              <Text style={[styles.locSectionLabel, { color: colors.text, marginTop: 16 }]}>
                {locSource === 'entry' ? 'SELECT ENTRY' : 'SELECT WAYPOINT'}
              </Text>
              {(locSource === 'entry' ? geoEntriesForPicker : []).map((entry) => (
                <Pressable
                  key={entry.id}
                  style={[
                    styles.locItem,
                    {
                      borderColor: locSelectedId === entry.id ? brandColors.copper : colors.border,
                      backgroundColor: locSelectedId === entry.id ? `${brandColors.copper}10` : colors.card,
                    },
                  ]}
                  onPress={() => setLocSelectedId(entry.id)}
                >
                  <Text style={[styles.locItemTitle, { color: colors.text }]} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  <Text style={[styles.locItemMeta, { color: colors.textTertiary }]}>
                    {[entry.place, entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null].filter(Boolean).join(' · ')}
                  </Text>
                  {entry.lat != null && (
                    <Text style={[styles.locItemCoords, { color: colors.textTertiary }]}>
                      {Math.abs(entry.lat).toFixed(2)}{entry.lat >= 0 ? 'N' : 'S'} / {Math.abs(entry.lon!).toFixed(2)}{entry.lon! >= 0 ? 'E' : 'W'}
                    </Text>
                  )}
                </Pressable>
              ))}
              {(locSource === 'waypoint' ? geoWaypoints : []).map((wp) => (
                <Pressable
                  key={wp.id}
                  style={[
                    styles.locItem,
                    {
                      borderColor: locSelectedId === String(wp.id) ? brandColors.blue : colors.border,
                      backgroundColor: locSelectedId === String(wp.id) ? `${brandColors.blue}10` : colors.card,
                    },
                  ]}
                  onPress={() => setLocSelectedId(String(wp.id))}
                >
                  <Text style={[styles.locItemTitle, { color: colors.text }]} numberOfLines={1}>
                    {wp.title || `Waypoint ${wp.sequence ?? wp.id}`}
                  </Text>
                  <Text style={[styles.locItemMeta, { color: colors.textTertiary }]}>
                    {[wp.description, wp.date ? new Date(wp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={[styles.locItemCoords, { color: colors.textTertiary }]}>
                    {Math.abs(wp.lat).toFixed(2)}{wp.lat >= 0 ? 'N' : 'S'} / {Math.abs(wp.lon).toFixed(2)}{wp.lon >= 0 ? 'E' : 'W'}
                  </Text>
                </Pressable>
              ))}

              {/* Visibility */}
              <Text style={[styles.locSectionLabel, { color: colors.text, marginTop: 16 }]}>LOCATION PRIVACY</Text>
              {([
                { value: 'public' as const, label: 'PUBLIC', desc: 'Visible to everyone' },
                { value: 'sponsors' as const, label: 'SPONSORS ONLY', desc: 'Only your sponsors can see' },
                { value: 'private' as const, label: 'PRIVATE', desc: 'Only visible to you' },
              ]).map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.locVisItem,
                    {
                      borderColor: locVisibility === opt.value ? brandColors.copper : colors.border,
                      backgroundColor: locVisibility === opt.value ? `${brandColors.copper}10` : colors.card,
                    },
                  ]}
                  onPress={() => setLocVisibility(opt.value)}
                >
                  <Text style={[styles.locVisLabel, { color: locVisibility === opt.value ? brandColors.copper : colors.text }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.locVisDesc, { color: colors.textTertiary }]}>{opt.desc}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
            <Pressable
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              onPress={() => setLocationModalVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: colors.text }]}>CANCEL</Text>
            </Pressable>
            <Pressable
              style={[styles.modalSaveBtn, { opacity: !locSelectedId || locSaving ? 0.5 : 1 }]}
              onPress={handleSaveLocation}
              disabled={!locSelectedId || locSaving}
            >
              <Text style={styles.modalSaveText}>{locSaving ? 'SAVING...' : 'SAVE LOCATION'}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 14 },
  mapArea: { height: 260 },
  mapOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32,32,32,0.65)',
    justifyContent: 'space-between',
  },
  mapTop: { padding: 14 },
  mapTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  heroTitle: { fontFamily: heading, fontSize: 20, fontWeight: '700', color: '#ffffff', lineHeight: 28 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  dateText: { fontSize: 12, fontFamily: mono, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  dateArrow: { color: '#ffffff', fontSize: 11 },
  heroMeta: { fontFamily: mono, fontSize: 11, fontWeight: '600', letterSpacing: 1, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  dayCount: { color: brandColors.copper, fontSize: 11, fontFamily: mono, fontWeight: '700', marginLeft: 'auto' },
  explorerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 10,
  },
  explorerTextWrap: { flex: 1 },
  explorerName: { fontFamily: mono, fontSize: 13, color: brandColors.copper, fontWeight: '700' },
  explorerBio: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 17 },
  statsWrapper: { borderTopWidth: borders.thick, borderBottomWidth: borders.thick },
  actionBar: {
    flexDirection: 'row',
    borderBottomWidth: borders.thick,
  },
  actionBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.7, fontFamily: mono },
  iconBtn: { paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  tabContent: { padding: 16 },
  emptyEntries: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: mono },
  // Notes — locked
  notesLockedCard: { borderWidth: borders.thick, alignItems: 'center', overflow: 'hidden' },
  notesLockedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#616161', width: '100%', paddingVertical: 10, paddingHorizontal: 14 },
  notesLockedTitle: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.7 },
  notesLockedSub: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: brandColors.copper, letterSpacing: 0.6, marginTop: 14 },
  notesLockedCount: { fontFamily: mono, fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 6 },
  notesLockedDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 8, paddingHorizontal: 20 },
  notesLockedBtn: { backgroundColor: brandColors.copper, paddingVertical: 12, paddingHorizontal: 24, marginTop: 14, marginBottom: 16 },
  notesLockedBtnText: { fontFamily: mono, fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.6 },
  // Notes — unlocked
  notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: brandColors.copper, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10 },
  notesHeaderTitle: { fontFamily: mono, fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 0.7 },
  notesHeaderSub: { fontFamily: mono, fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  logNoteBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingVertical: 6, paddingHorizontal: 10 },
  logNoteBtnText: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  // Notes — form
  noteFormCard: { borderWidth: borders.thick, padding: 12, marginBottom: 10 },
  noteFormLabel: { fontFamily: mono, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  noteFormInput: { borderWidth: 1, padding: 10, fontSize: 14, lineHeight: 20, minHeight: 80, textAlignVertical: 'top' },
  noteFormFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  noteFormCount: { fontFamily: mono, fontSize: 11, fontWeight: '600' },
  noteFormSubmit: { backgroundColor: brandColors.copper, paddingVertical: 8, paddingHorizontal: 14 },
  noteFormSubmitText: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  // Notes — cards
  noteCard: { borderWidth: borders.thick, marginBottom: 10, overflow: 'hidden' },
  noteCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  noteCardBadge: { backgroundColor: brandColors.copper, paddingVertical: 3, paddingHorizontal: 8 },
  noteCardBadgeText: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  noteStatusBadge: { paddingVertical: 2, paddingHorizontal: 6 },
  noteStatusText: { fontFamily: mono, fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  noteTimestamp: { fontFamily: mono, fontSize: 11, fontWeight: '600', marginLeft: 'auto' },
  noteActions: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingBottom: 6 },
  noteActionText: { fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  noteText: { fontSize: 14, lineHeight: 21, paddingHorizontal: 12, paddingBottom: 10 },
  noteRespondBtn: { paddingHorizontal: 12, paddingBottom: 10 },
  noteRespondText: { fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  // Notes — replies
  replyFormWrap: { borderTopWidth: 1, marginHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  repliesWrap: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  repliesCount: { fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  replyRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  replyContent: { flex: 1 },
  replyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyAuthor: { fontSize: 13, fontWeight: '700' },
  explorerBadge: { backgroundColor: brandColors.copper, paddingVertical: 1, paddingHorizontal: 5 },
  explorerBadgeText: { fontFamily: mono, fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 0.4 },
  replyDate: { fontFamily: mono, fontSize: 11, fontWeight: '600', marginLeft: 'auto' },
  replyText: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  // Sponsors
  sponsorCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: borders.thick, padding: 12, marginBottom: 8 },
  sponsorInfo: { flex: 1 },
  sponsorName: { fontSize: 14, fontWeight: '700' },
  sponsorMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sponsorAmount: { fontSize: 13, fontWeight: '700', fontFamily: mono },
  sponsorType: { fontSize: 11, fontWeight: '600', fontFamily: mono, letterSpacing: 0.5 },
  sponsorMessage: { fontSize: 13, fontStyle: 'italic', marginTop: 4, lineHeight: 18 },
  // Waypoints
  waypointCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: borders.thick, padding: 12, marginBottom: 8 },
  waypointSeq: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  waypointSeqText: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: mono },
  waypointInfo: { flex: 1 },
  waypointTitle: { fontSize: 14, fontWeight: '700' },
  waypointMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  waypointCoords: { fontSize: 12, fontFamily: mono, fontWeight: '600' },
  waypointDate: { fontSize: 12, fontFamily: mono, fontWeight: '600' },
  waypointDesc: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  viewMapBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingVertical: 5, paddingHorizontal: 8, alignSelf: 'flex-start' },
  viewMapText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.5)', fontFamily: mono },
  currentLocRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: brandColors.blue },
  currentLocLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currentlyLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.7)', fontFamily: mono },
  currentlyCity: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  currentlyCoords: { fontSize: 12, fontFamily: mono, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  // Popups
  popupSafeWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  popupWrap: { marginTop: 72, marginHorizontal: 12, borderWidth: borders.thick, padding: 10 },
  popupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  popupTitle: { fontFamily: mono, fontSize: 13, fontWeight: '700', flex: 1 },
  popupClose: { fontSize: 14, fontWeight: '600' },
  popupPlace: { fontFamily: mono, fontSize: 12, marginTop: 2 },
  popupDate: { fontFamily: mono, fontSize: 11, marginTop: 2 },
  popupBtn: { marginTop: 8, backgroundColor: brandColors.copper, paddingVertical: 10, alignItems: 'center' },
  popupBtnText: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.6 },
  // Fullscreen map
  fullMapHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 10, gap: 12 },
  fullMapTitle: { fontFamily: mono, fontSize: 14, fontWeight: '700', color: '#ffffff', letterSpacing: 0.6, flex: 1 },
  fullMapCloseBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingVertical: 8, paddingHorizontal: 14 },
  fullMapCloseText: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: '#ffffff', letterSpacing: 0.6 },
  fullMapBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: brandColors.blue, zIndex: 10 },
  mapLegend: { position: 'absolute', bottom: 100, left: 10, zIndex: 10, borderWidth: borders.thick, padding: 10 },
  mapLegendTitle: { fontFamily: mono, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  mapLegendItems: { gap: 6 },
  mapLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapLegendDotWrap: { width: 22, alignItems: 'center', justifyContent: 'center' },
  mapLegendDot: { alignItems: 'center', justifyContent: 'center' },
  mapLegendDotText: { color: '#fff', fontSize: 9, fontWeight: '700', fontFamily: mono },
  mapLegendText: { fontSize: 11, fontWeight: '600' },
  mapLegendSep: { borderTopWidth: 1, marginVertical: 2 },
  // Update Location Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: brandColors.blue, paddingHorizontal: 14, paddingVertical: 12 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  modalTitle: { fontFamily: mono, fontSize: 14, fontWeight: '700', color: '#fff', letterSpacing: 0.6 },
  modalSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  modalCloseBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', paddingVertical: 6, paddingHorizontal: 12 },
  modalCloseText: { fontFamily: mono, fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
  modalScroll: { flex: 1 },
  modalBody: { padding: 16 },
  locInfoBox: { borderLeftWidth: 4, paddingLeft: 12, paddingVertical: 8, marginBottom: 20 },
  locInfoTitle: { fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  locInfoDesc: { fontSize: 13, lineHeight: 18 },
  locSectionLabel: { fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  locSourceRow: { flexDirection: 'row', gap: 8 },
  locSourceBtn: { flex: 1, borderWidth: borders.thick, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locSourceLabel: { fontFamily: mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  locSourceCount: { fontFamily: mono, fontSize: 12, fontWeight: '600' },
  locItem: { borderWidth: borders.thick, padding: 12, marginBottom: 8 },
  locItemTitle: { fontSize: 14, fontWeight: '700' },
  locItemMeta: { fontFamily: mono, fontSize: 11, fontWeight: '600', marginTop: 3 },
  locItemCoords: { fontFamily: mono, fontSize: 11, fontWeight: '600', marginTop: 2 },
  locVisItem: { borderWidth: borders.thick, padding: 12, marginBottom: 8 },
  locVisLabel: { fontFamily: mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  locVisDesc: { fontSize: 12, marginTop: 2 },
  modalFooter: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: borders.thick },
  modalCancelBtn: { flex: 1, borderWidth: borders.thick, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontFamily: mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  modalSaveBtn: { flex: 2, backgroundColor: brandColors.copper, paddingVertical: 12, alignItems: 'center' },
  modalSaveText: { fontFamily: mono, fontSize: 12, fontWeight: '700', color: '#fff', letterSpacing: 0.5 },
});
