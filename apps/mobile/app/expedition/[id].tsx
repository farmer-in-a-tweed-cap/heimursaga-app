import { useState, useEffect, useCallback, ComponentType } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { api, ApiError, bookmarksApi } from '@/services/api';
import { colors as brandColors, mono, borders } from '@/theme/tokens';
import { Svg, Path, Line, Polyline, Circle, Rect } from 'react-native-svg';
import { NavBar } from '@/components/ui/NavBar';
import { StatusHeader } from '@/components/ui/StatusHeader';
import { StatsBar } from '@/components/ui/StatsBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { HCard } from '@/components/ui/HCard';
import { Avatar } from '@/components/ui/Avatar';
import { EntryCardMini } from '@/components/cards/EntryCardMini';
import type { HeimuMapProps, WaypointMarker } from '@/components/map/HeimuMap';
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
  region?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  author?: { username: string; name?: string; picture?: string };
  raised?: number;
  goal?: number;
  sponsorsCount?: number;
  entriesCount?: number;
  waypointsCount?: number;
  entries?: ApiEntry[];
  sponsors?: ExpeditionSponsor[];
  waypoints?: ExpeditionWaypoint[];
  bookmarked?: boolean;
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
  const [submitting, setSubmitting] = useState(false);

  // Defer MapboxGL import to avoid blocking the JS thread
  const [MapComponent, setMapComponent] = useState<ComponentType<HeimuMapProps> | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      import('@/components/map/HeimuMap').then((mod) => setMapComponent(() => mod.default));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const { data: expedition, loading, error } = useApi<ExpeditionDetail>(`/trips/${id}`);

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

  const handlePostNote = async () => {
    if (!noteText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/trips/${id}/notes`, { text: noteText.trim() });
      setNoteText('');
      setShowNoteForm(false);
      await fetchNotes();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to post note');
    }
    setSubmitting(false);
  };

  const handlePostReply = async (noteId: number) => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/trips/${id}/notes/${noteId}/replies`, { text: replyText.trim() });
      setReplyText('');
      setReplyingTo(null);
      await fetchNotes();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to post reply');
    }
    setSubmitting(false);
  };

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
  const typeRegion = [expedition.type?.toUpperCase(), expedition.region?.toUpperCase()]
    .filter(Boolean)
    .join(' / ');

  // Geo entries and markers for the map
  const geoEntries = (expedition.entries ?? []).filter(e => e.lat != null && e.lon != null);
  const routeCoords: [number, number][] = geoEntries.map(e => [e.lon!, e.lat!]);
  const waypoints: WaypointMarker[] = geoEntries.map((e, i, arr) => ({
    coordinates: [e.lon!, e.lat!],
    type: i === 0 ? 'origin' : i === arr.length - 1 ? 'destination' : 'waypoint',
    label: e.place,
  }));

  // Compute bounds that contain all entry markers
  const mapBounds = geoEntries.length > 0
    ? {
        ne: [
          Math.max(...geoEntries.map(e => e.lon!)),
          Math.max(...geoEntries.map(e => e.lat!)),
        ] as [number, number],
        sw: [
          Math.min(...geoEntries.map(e => e.lon!)),
          Math.min(...geoEntries.map(e => e.lat!)),
        ] as [number, number],
      }
    : undefined;

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
              center={[0, 20]}
              zoom={2}
              routeCoords={routeCoords.length > 1 ? routeCoords : undefined}
              waypoints={waypoints}
              interactive
              onWaypointPress={(i) => setSelectedEntry(geoEntries[i])}
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
          {/* Bottom: current location bar */}
          <SafeAreaView style={styles.fullMapBottom} edges={['bottom']}>
            <View style={styles.currentLocRow}>
              <View style={styles.currentLocLeft}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
                  <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <Circle cx={12} cy={10} r={3} />
                </Svg>
                <Text style={styles.currentlyLabel}>CURRENTLY</Text>
                <Text style={styles.currentlyCity}>{expedition.entries?.[0]?.place ?? 'En Route'}</Text>
              </View>
              <Text style={styles.currentlyCoords}>
                {expedition.entries?.[0]?.lat != null ? `${Math.abs(expedition.entries[0].lat).toFixed(2)}${expedition.entries[0].lat >= 0 ? 'N' : 'S'} / ${Math.abs(expedition.entries[0].lon!).toFixed(2)}${expedition.entries[0].lon! >= 0 ? 'E' : 'W'}` : ''}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      )}

      <ScrollView>
        <NavBar onBack={() => router.back()} />

        {/* Status */}
        <StatusHeader status={expedition.status} label={statusLabel} right={typeRegion} />

        {/* Map hero area (banner) */}
        <View style={styles.mapArea}>
          {MapComponent && (
            <MapComponent
              style={StyleSheet.absoluteFillObject}
              bounds={mapBounds ? { ...mapBounds, padding: 40 } : undefined}
              center={[0, 20]}
              zoom={2}
              routeCoords={routeCoords.length > 1 ? routeCoords : undefined}
              waypoints={waypoints}
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
            </View>

            {/* Spacer pushes bottom content down */}
            <View style={{ flex: 1 }} />

            {/* Explorer info */}
            {expedition.author && (
              <Pressable
                onPress={() => router.push(`/explorer/${expedition.author!.username}`)}
                style={styles.explorerRow}
              >
                <Avatar size={28} name={expedition.author.username} imageUrl={expedition.author.picture} />
                <View>
                  <Text style={styles.explorerName}>
                    {expedition.author.name || expedition.author.username}
                  </Text>
                  {expedition.description && (
                    <Text style={styles.explorerBio} numberOfLines={1}>
                      {expedition.description}
                    </Text>
                  )}
                </View>
              </Pressable>
            )}

            {/* Current location */}
            <View style={styles.currentLocRow}>
              <View style={styles.currentLocLeft}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={3}>
                  <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <Circle cx={12} cy={10} r={3} />
                </Svg>
                <Text style={styles.currentlyLabel}>CURRENTLY</Text>
                <Text style={styles.currentlyCity}>{expedition.entries?.[0]?.place ?? 'En Route'}</Text>
              </View>
              <Text style={styles.currentlyCoords}>
                {expedition.entries?.[0]?.lat != null ? `${Math.abs(expedition.entries[0].lat).toFixed(2)}${expedition.entries[0].lat >= 0 ? 'N' : 'S'} / ${Math.abs(expedition.entries[0].lon!).toFixed(2)}${expedition.entries[0].lon! >= 0 ? 'E' : 'W'}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats bar */}
        <View style={[styles.statsWrapper, { borderColor: colors.border }]}>
          <StatsBar
            stats={[
              {
                value: `$${(expedition.raised ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                label: 'RAISED',
              },
              { value: String(expedition.sponsorsCount ?? 0), label: 'SPONSORS' },
              { value: String(expedition.entriesCount ?? 0), label: 'ENTRIES' },
            ]}
          />
        </View>

        {/* Action bar */}
        <View style={[styles.actionBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <Pressable style={[styles.actionBtn, { borderRightWidth: 1, borderRightColor: colors.borderThin }]}>
            <Text style={[styles.actionText, { color: brandColors.copper }]}>SPONSOR</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, { borderRightWidth: 1, borderRightColor: colors.borderThin }]}>
            <Text style={[styles.actionText, { color: brandColors.blue }]}>FOLLOW</Text>
          </Pressable>
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
                        disabled={!noteText.trim() || submitting}
                      >
                        <Text style={styles.noteFormSubmitText}>
                          {submitting ? 'POSTING...' : 'LOG NOTE'}
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

                      {/* Note text */}
                      <Text style={[styles.noteText, { color: colors.text }]}>{note.text}</Text>

                      {/* Respond button */}
                      {isAuthenticated && !notesLocked && (
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
                              disabled={!replyText.trim() || submitting}
                            >
                              <Text style={styles.noteFormSubmitText}>
                                {submitting ? 'POSTING...' : 'LOG RESPONSE'}
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
                          {note.replies.map((reply) => (
                            <View key={reply.id} style={styles.replyRow}>
                              <Avatar size={24} name={reply.authorName} imageUrl={reply.authorPicture} />
                              <View style={styles.replyContent}>
                                <View style={styles.replyHeader}>
                                  <Text style={[styles.replyAuthor, { color: colors.text }]}>{reply.authorName}</Text>
                                  {reply.isExplorer && (
                                    <View style={styles.explorerBadge}>
                                      <Text style={styles.explorerBadgeText}>EXPLORER</Text>
                                    </View>
                                  )}
                                  <Text style={[styles.replyDate, { color: colors.textTertiary }]}>
                                    {new Date(reply.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </Text>
                                </View>
                                <Text style={[styles.replyText, { color: colors.textSecondary }]}>{reply.text}</Text>
                              </View>
                            </View>
                          ))}
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
                        ? sponsor.user.name || sponsor.user.username
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
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', lineHeight: 24 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  dateText: { fontSize: 12, fontFamily: mono, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  dateArrow: { color: brandColors.copper, fontSize: 11 },
  dayCount: { color: brandColors.copper, fontSize: 11, fontFamily: mono, fontWeight: '700', marginLeft: 'auto' },
  explorerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  explorerName: { fontSize: 12, color: brandColors.copper, fontWeight: '700' },
  explorerBio: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
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
  currentLocRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: brandColors.copper },
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
  fullMapBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: brandColors.copper, zIndex: 10 },
});
