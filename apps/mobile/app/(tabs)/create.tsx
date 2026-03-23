import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Pressable,
  ActivityIndicator, Alert, Platform, Switch,
} from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { CalendarPicker, fmtDateISO, fmtDateDisplay, todayISO } from '@/components/ui/CalendarPicker';
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available (e.g. running in Expo Go)
}
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { HTextField } from '@/components/ui/HTextField';
import { HButton } from '@/components/ui/HButton';
import { PhotoGrid, PhotoItem } from '@/components/ui/PhotoGrid';
import { RadioOption } from '@/components/ui/RadioOption';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';
import { Svg, Path, Circle } from 'react-native-svg';
import { entryApi, uploadApi } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition, Entry, Waypoint } from '@/types/api';

const VISIBILITY_OPTIONS = [
  { label: 'PUBLIC', description: 'Visible to all' },
  { label: 'OFF-GRID', description: 'Hidden from feeds' },
  { label: 'PRIVATE', description: 'Only you can see this' },
];

const ENTRY_TYPES = ['STANDARD', 'PHOTO', 'VIDEO', 'DATA'];
const ENTRY_TYPE_VALUES = ['standard', 'photo', 'video', 'data'] as const;

export default function CreateScreen() {
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { expeditionId: routeExpeditionId } = useGlobalSearchParams<{ expeditionId?: string }>();
  const { ready, user } = useRequireAuth();

  // Core fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState(0);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [selectedExpedition, setSelectedExpedition] = useState<string | null>(null);
  const [selectedWaypointId, setSelectedWaypointId] = useState<number | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExpPicker, setShowExpPicker] = useState(false);
  const [showWaypointPicker, setShowWaypointPicker] = useState(false);

  // New fields matching web app
  const [entryType, setEntryType] = useState(0);
  const [dateStr, setDateStr] = useState(() => todayISO());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isMilestone, setIsMilestone] = useState(false);

  // Metadata fields (standard)
  const [weather, setWeather] = useState('');
  const [mood, setMood] = useState('');
  const [distanceTraveled, setDistanceTraveled] = useState('');
  const [expenses, setExpenses] = useState('');

  // Video URL
  const [videoUrl, setVideoUrl] = useState('');

  // Metadata fields (data)
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [pressure, setPressure] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [duration, setDuration] = useState('');

  // Draft recovery
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);

  const { data: tripsData } = useApi<{ data: Expedition[]; results: number }>(
    ready ? '/user/trips' : null,
  );
  const expeditions = tripsData?.data ?? [];

  // Fetch expedition detail (with waypoints) when an expedition is selected
  const { data: expDetail } = useApi<any>(
    selectedExpedition ? `/trips/${selectedExpedition}` : null,
  );
  // API may return { data: { waypoints } } or { waypoints } depending on wrapper
  const rawWaypoints: any[] = expDetail?.data?.waypoints ?? expDetail?.waypoints ?? [];
  // Normalize waypoint fields (API returns title/lat/lon/sequence)
  const expeditionWaypoints: Waypoint[] = rawWaypoints.map((w: any) => ({
    ...w,
    name: w.name ?? w.title,
    latitude: w.latitude ?? w.lat,
    longitude: w.longitude ?? w.lon,
    order: w.order ?? w.sequence,
  }));

  // Pre-select expedition when navigated with expeditionId param
  const appliedRouteExpedition = useRef<string | null>(null);
  useEffect(() => {
    if (
      routeExpeditionId &&
      routeExpeditionId !== appliedRouteExpedition.current &&
      expeditions.length > 0
    ) {
      const match = expeditions.find(e => e.id === routeExpeditionId);
      if (match) {
        appliedRouteExpedition.current = routeExpeditionId;
        setSelectedExpedition(routeExpeditionId);
        setSelectedWaypointId(null);
        setLocation('');
        setLat(null);
        setLon(null);
      }
    }
  }, [routeExpeditionId, expeditions]);

  // ─── Draft Recovery ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!ready || draftChecked) return;
    setDraftChecked(true);

    entryApi.getDrafts().then((res) => {
      const drafts = (res as any)?.data ?? [];
      if (drafts.length === 0) return;

      // Find a matching draft: standalone if no expedition selected
      const draft: Entry | undefined = drafts[0];
      if (!draft) return;

      Alert.alert(
        'Draft Found',
        `Load draft "${draft.title}"?`,
        [
          { text: 'Start Fresh', style: 'cancel' },
          {
            text: 'Load Draft',
            onPress: () => {
              setDraftId(draft.id);
              setTitle(draft.title ?? '');
              setBody(draft.content ?? '');
              setLocation(draft.place ?? '');
              if (draft.lat != null) setLat(draft.lat);
              if (draft.lon != null) setLon(draft.lon);
              if (draft.date) setDateStr(draft.date.split('T')[0]);
              if (draft.entryType) {
                const idx = ENTRY_TYPE_VALUES.indexOf(draft.entryType as any);
                if (idx >= 0) setEntryType(idx);
              }
              if (draft.isMilestone) setIsMilestone(true);
              if (draft.commentsEnabled === false) setCommentsEnabled(false);
              if (draft.visibility) {
                const visIdx = VISIBILITY_OPTIONS.findIndex(
                  (v) => v.label.toLowerCase() === draft.visibility,
                );
                if (visIdx >= 0) setVisibility(visIdx);
              }
              const tripId = draft.trip?.id ?? draft.expedition?.id;
              if (tripId) setSelectedExpedition(tripId);
              // Restore media
              if (draft.media && draft.media.length > 0) {
                setPhotos(draft.media.map((m, i) => ({
                  _id: `draft_${i}`,
                  uri: m.original ?? m.url ?? m.thumbnail ?? '',
                  uploadId: m.id,
                  thumbnail: m.thumbnail,
                })));
              }
            },
          },
        ],
      );
    }).catch(() => { /* ignore draft fetch errors */ });
  }, [ready, draftChecked]);

  // ─── Photo Upload ────────────────────────────────────────────────────────────

  let nextPhotoId = useRef(0);

  const handleAddPhoto = useCallback(async () => {
    if (!ImagePicker) {
      Alert.alert('Unavailable', 'Image picker requires a development build.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const id = `photo_${nextPhotoId.current++}`;
      const newPhoto: PhotoItem = { _id: id, uri, uploading: true };
      setPhotos((prev) => [...prev, newPhoto]);

      try {
        const uploadResult = await uploadApi.upload(uri);
        setPhotos((prev) =>
          prev.map((p) =>
            p._id === id
              ? { ...p, uploadId: uploadResult.uploadId, thumbnail: uploadResult.thumbnail, uploading: false }
              : p,
          ),
        );
      } catch {
        setPhotos((prev) =>
          prev.map((p) =>
            p._id === id ? { ...p, uploading: false, failed: true } : p,
          ),
        );
      }
    }
  }, []);

  const handleRetryUpload = useCallback((index: number) => {
    setPhotos((prev) => {
      const photo = prev[index];
      if (!photo) return prev;
      const id = photo._id;
      // Mark as uploading synchronously, then kick off the upload
      const updated = prev.map((p) => (p._id === id ? { ...p, uploading: true, failed: false } : p));

      uploadApi.upload(photo.uri).then((uploadResult) => {
        setPhotos((cur) =>
          cur.map((p) =>
            p._id === id
              ? { ...p, uploadId: uploadResult.uploadId, thumbnail: uploadResult.thumbnail, uploading: false }
              : p,
          ),
        );
      }).catch(() => {
        setPhotos((cur) =>
          cur.map((p) => (p._id === id ? { ...p, uploading: false, failed: true } : p)),
        );
      });

      return updated;
    });
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setCoverIndex((prev) => {
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  }, []);

  // ─── Expedition & Waypoint Selection ────────────────────────────────────────

  const handleSelectExpedition = useCallback((expId: string | null) => {
    setSelectedExpedition(expId);
    setShowExpPicker(false);
    // Clear waypoint when expedition changes
    setSelectedWaypointId(null);
    if (expId) {
      // Clear free-form location — will be set from waypoint
      setLocation('');
      setLat(null);
      setLon(null);
    }
  }, []);

  const handleSelectWaypoint = useCallback((wp: Waypoint) => {
    setSelectedWaypointId(wp.id);
    setShowWaypointPicker(false);
    // Lock location to waypoint coordinates
    const wpName = wp.name ?? wp.title ?? 'Waypoint';
    const wpLat = wp.latitude ?? wp.lat;
    const wpLon = wp.longitude ?? wp.lon;
    setLocation(wpName);
    if (wpLat != null) setLat(wpLat);
    if (wpLon != null) setLon(wpLon);
  }, []);

  // ─── Location ────────────────────────────────────────────────────────────────

  const handleLocationSelect = useCallback((data: { place: string; lat: number; lon: number }) => {
    setLocation(data.place);
    setLat(data.lat);
    setLon(data.lon);
  }, []);

  // ─── Date ────────────────────────────────────────────────────────────────────

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handlePublish = useCallback(async (isDraft: boolean) => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your entry.');
      return;
    }

    // Validation for publish (not drafts)
    if (!isDraft) {
      if (selectedExpedition && !selectedWaypointId) {
        Alert.alert('Waypoint required', 'Select a waypoint to log this entry against.');
        return;
      }
      if (!location.trim()) {
        Alert.alert('Location required', 'Please set a location for your entry.');
        return;
      }
      const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 10) {
        Alert.alert('Content too short', 'Please write at least a few sentences.');
        return;
      }
    }

    // Check for pending uploads
    const pendingUploads = photos.some((p) => p.uploading);
    if (pendingUploads) {
      Alert.alert('Uploads in progress', 'Please wait for photos to finish uploading.');
      return;
    }

    const failedUploads = photos.some((p) => p.failed);
    if (failedUploads) {
      Alert.alert('Upload failed', 'Some photos failed to upload. Remove or retry them before publishing.');
      return;
    }

    setSubmitting(true);
    try {
      const uploads = photos
        .map((p) => p.uploadId)
        .filter((id): id is string => !!id);

      const coverUploadId = photos[coverIndex]?.uploadId ?? undefined;

      // Build metadata based on entry type
      const metadata: Record<string, unknown> = {};
      const typeValue = ENTRY_TYPE_VALUES[entryType];

      const safeFloat = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : undefined; };

      if (typeValue === 'standard' || typeValue === 'photo') {
        if (weather.trim()) metadata.weather = weather.trim();
        if (mood.trim()) metadata.mood = mood.trim();
        const dist = safeFloat(distanceTraveled); if (dist !== undefined) metadata.distanceTraveled = dist;
        const exp = safeFloat(expenses); if (exp !== undefined) metadata.expenses = exp;
      }
      if (typeValue === 'video' && videoUrl.trim()) {
        metadata.videoUrl = videoUrl.trim();
      }
      if (typeValue === 'data') {
        const temp = safeFloat(temperature); if (temp !== undefined) metadata.temperature = temp;
        const hum = safeFloat(humidity); if (hum !== undefined) metadata.humidity = hum;
        const wind = safeFloat(windSpeed); if (wind !== undefined) metadata.windSpeed = wind;
        const pres = safeFloat(pressure); if (pres !== undefined) metadata.pressure = pres;
        const elev = safeFloat(elevationGain); if (elev !== undefined) metadata.elevationGain = elev;
        const dur = safeFloat(duration); if (dur !== undefined) metadata.duration = dur;
        const distCov = safeFloat(distanceTraveled); if (distCov !== undefined) metadata.distanceCovered = distCov;
      }

      const entryData: Record<string, unknown> = {
        title: title.trim(),
        content: body.trim(),
        place: location.trim() || undefined,
        lat: lat ?? undefined,
        lon: lon ?? undefined,
        date: dateStr,
        visibility: selectedExpedition ? undefined : VISIBILITY_OPTIONS[visibility].label.toLowerCase(),
        isDraft,
        expeditionId: selectedExpedition ?? undefined,
        waypointId: selectedWaypointId ?? undefined,
        entryType: typeValue,
        commentsEnabled,
        isMilestone,
        uploads: uploads.length > 0 ? uploads : undefined,
        coverUploadId,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      if (draftId) {
        await entryApi.updateEntry(draftId, entryData as Partial<Entry>);
      } else {
        await entryApi.createEntry(entryData);
      }

      Alert.alert(
        isDraft ? 'Draft saved' : 'Entry published',
        undefined,
        [{
          text: 'OK',
          onPress: () => {
            resetForm();
            if (!isDraft) router.push('/(tabs)/profile');
          },
        }],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save entry';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    title, body, location, visibility, selectedExpedition, selectedWaypointId, lat, lon, dateStr,
    photos, coverIndex, entryType, commentsEnabled, isMilestone, draftId,
    weather, mood, distanceTraveled, expenses,
    temperature, humidity, windSpeed, pressure, elevationGain, duration,
    router,
  ]);

  const resetForm = useCallback(() => {
    setTitle('');
    setBody('');
    setLocation('');
    setLat(null);
    setLon(null);
    setPhotos([]);
    setCoverIndex(0);
    setDateStr(todayISO());
    setEntryType(0);
    setCommentsEnabled(true);
    setIsMilestone(false);
    setWeather('');
    setMood('');
    setDistanceTraveled('');
    setExpenses('');
    setTemperature('');
    setHumidity('');
    setWindSpeed('');
    setPressure('');
    setElevationGain('');
    setDuration('');
    setDraftId(null);
    setDraftChecked(false);
    setSelectedExpedition(null);
    setSelectedWaypointId(null);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  const selectedExp = expeditions.find((e) => e.id === selectedExpedition);
  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const typeValue = ENTRY_TYPE_VALUES[entryType];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar
        title="LOG ENTRY"
        right={
          <TouchableOpacity onPress={() => handlePublish(true)} disabled={submitting}>
            <Text style={styles.saveBtn}>SAVE</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.form}>
          <HCard>
            <View style={styles.formInner}>

          {/* Entry type selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ENTRY TYPE</Text>
            <SegmentedControl
              options={ENTRY_TYPES}
              active={entryType}
              onSelect={setEntryType}
            />
          </View>

          {/* Expedition selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>EXPEDITION</Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={() => setShowExpPicker(!showExpPicker)}
            >
              <Text style={[styles.selectorText, { color: selectedExp ? colors.text : colors.textTertiary }]}>
                {selectedExp?.title ?? 'Standalone entry'}
              </Text>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Path d="M6 9l6 6 6-6" />
              </Svg>
            </TouchableOpacity>
            {showExpPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.borderThin }]}
                  onPress={() => handleSelectExpedition(null)}
                >
                  <Text style={[styles.pickerItemText, { color: colors.textTertiary }]}>Standalone entry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerItem, { borderBottomColor: colors.borderThin }]}
                  onPress={() => { setShowExpPicker(false); router.push('/expedition/create'); }}
                >
                  <Text style={[styles.pickerItemText, { color: brandColors.copper }]}>+ CREATE NEW EXPEDITION</Text>
                </TouchableOpacity>
                {expeditions.map((exp) => (
                  <TouchableOpacity
                    key={exp.id}
                    style={[styles.pickerItem, { borderBottomColor: colors.borderThin }]}
                    onPress={() => handleSelectExpedition(exp.id)}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>{exp.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Waypoint selector — required for expedition entries */}
          {selectedExpedition && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>WAYPOINT</Text>
              <TouchableOpacity
                style={[styles.selector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setShowWaypointPicker(!showWaypointPicker)}
              >
                <Text style={[styles.selectorText, { color: selectedWaypointId ? colors.text : colors.textTertiary }]}>
                  {selectedWaypointId
                    ? (expeditionWaypoints.find((w) => w.id === selectedWaypointId)?.name ?? 'Waypoint')
                    : 'Select a waypoint to convert'}
                </Text>
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                  <Path d="M6 9l6 6 6-6" />
                </Svg>
              </TouchableOpacity>
              {showWaypointPicker && (
                <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border, overflow: 'hidden' }]}>
                  {expeditionWaypoints.length === 0 ? (
                    <View style={styles.pickerItem}>
                      <Text style={[styles.pickerItemText, { color: colors.textTertiary }]}>
                        No waypoints — add them in the expedition builder
                      </Text>
                    </View>
                  ) : (
                    expeditionWaypoints.map((wp) => {
                      const wpLat = wp.latitude ?? wp.lat ?? 0;
                      const wpLon = wp.longitude ?? wp.lon ?? 0;
                      const hasEntry = (wp.entryIds && wp.entryIds.length > 0) || (typeof wp.entryId === 'string' && wp.entryId.length > 0);
                      return (
                        <TouchableOpacity
                          key={wp.id}
                          style={[styles.pickerItem, { borderBottomColor: colors.borderThin }]}
                          onPress={() => handleSelectWaypoint(wp)}
                        >
                          <View style={styles.waypointItem}>
                            <View style={[styles.waypointDot, { backgroundColor: hasEntry ? brandColors.copper : brandColors.blue }]} />
                            <View style={styles.waypointItemInfo}>
                              <Text style={[styles.pickerItemText, { color: colors.text }]}>{wp.name ?? wp.title}</Text>
                              <Text style={[styles.waypointCoords, { color: colors.textTertiary }]}>
                                {Math.abs(wpLat).toFixed(2)}{wpLat >= 0 ? 'N' : 'S'} / {Math.abs(wpLon).toFixed(2)}{wpLon >= 0 ? 'E' : 'W'}
                                {hasEntry ? '  \u2022 has entry' : ''}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}
              {selectedWaypointId && lat != null && lon != null && (
                <View style={[styles.waypointLocked, { borderColor: colors.border }]}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2.5}>
                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <Circle cx={12} cy={10} r={3} />
                  </Svg>
                  <Text style={[styles.waypointLockedText, { color: colors.textTertiary }]}>
                    Location locked to waypoint — {Math.abs(lat).toFixed(2)}{lat >= 0 ? 'N' : 'S'} / {Math.abs(lon).toFixed(2)}{lon >= 0 ? 'E' : 'W'}
                  </Text>
                </View>
              )}
            </View>
          )}

          <HTextField label="TITLE" placeholder="Give your entry a title" value={title} onChangeText={setTitle} />

          {/* Date picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DATE</Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.selectorText, { color: colors.text }]}>
                {fmtDateDisplay(dateStr)}
              </Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
              </Svg>
            </TouchableOpacity>
            <CalendarPicker
              visible={showDatePicker}
              value={dateStr}
              maxDate={(() => {
                const today = todayISO();
                const exp = expDetail?.data ?? expDetail;
                const end = exp?.endDate?.slice(0, 10);
                return end && end > today ? end : today;
              })()}
              onSelect={setDateStr}
              onClose={() => setShowDatePicker(false)}
            />
          </View>

          {/* Location — only for standalone entries; expedition entries use waypoint */}
          {!selectedExpedition && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>LOCATION</Text>
              <Pressable
                style={[styles.locationBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                onPress={() => setShowLocationPicker(true)}
              >
                <View style={styles.locationInfo}>
                  <View style={styles.locationNameRow}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2.5}>
                      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <Circle cx={12} cy={10} r={3} />
                    </Svg>
                    <Text style={[styles.locationName, { color: location ? colors.text : colors.textTertiary }]} numberOfLines={2}>
                      {location || 'Set location'}
                    </Text>
                  </View>
                  {location && lat != null && lon != null ? (
                    <Text style={[styles.locationCoords, { color: colors.textTertiary }]}>
                      {Math.abs(lat).toFixed(2)}{lat >= 0 ? 'N' : 'S'} / {Math.abs(lon).toFixed(2)}{lon >= 0 ? 'E' : 'W'}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.locationChange}>{location ? 'CHANGE' : 'SET'}</Text>
              </Pressable>
            </View>
          )}

          {/* Content */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>CONTENT</Text>
              <Text style={[styles.wordCount, { color: colors.textTertiary }]}>
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
              </Text>
            </View>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              multiline
              placeholder="Write your journal entry..."
              placeholderTextColor={colors.textTertiary}
              value={body}
              onChangeText={setBody}
              textAlignVertical="top"
            />
          </View>

          {/* Photos */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              PHOTOS{photos.length > 0 ? ` (${photos.length})` : ''}
            </Text>
            <PhotoGrid
              photos={photos}
              coverIndex={photos.length > 0 ? coverIndex : undefined}
              onAdd={handleAddPhoto}
              onRemove={handleRemovePhoto}
              onSetCover={setCoverIndex}
              onRetry={handleRetryUpload}
            />
            {photos.length > 1 && (
              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                Tap star to set cover image
              </Text>
            )}
          </View>

          {/* Type-specific metadata */}
          {(typeValue === 'standard' || typeValue === 'photo') && (
            <View style={styles.fieldGroup}>
              <SectionDivider title="METADATA" />
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="WEATHER" placeholder="Sunny, Rainy..." value={weather} onChangeText={setWeather} />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="MOOD" placeholder="Energetic..." value={mood} onChangeText={setMood} />
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="DISTANCE (KM)" placeholder="0" value={distanceTraveled} onChangeText={setDistanceTraveled} keyboardType="decimal-pad" />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="EXPENSES" placeholder="0.00" value={expenses} onChangeText={setExpenses} keyboardType="decimal-pad" />
                </View>
              </View>
            </View>
          )}

          {typeValue === 'video' && (
            <View style={styles.fieldGroup}>
              <SectionDivider title="VIDEO" />
              <HTextField
                label="VIDEO URL"
                placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                value={videoUrl}
                onChangeText={setVideoUrl}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          )}

          {typeValue === 'data' && (
            <View style={styles.fieldGroup}>
              <SectionDivider title="DATA FIELDS" />
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="TEMP. (\u00B0C)" placeholder="0" value={temperature} onChangeText={setTemperature} keyboardType="decimal-pad" />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="HUMIDITY (%)" placeholder="0" value={humidity} onChangeText={setHumidity} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="WIND (KM/H)" placeholder="0" value={windSpeed} onChangeText={setWindSpeed} keyboardType="decimal-pad" />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="PRESSURE (hPa)" placeholder="0" value={pressure} onChangeText={setPressure} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="DISTANCE (KM)" placeholder="0" value={distanceTraveled} onChangeText={setDistanceTraveled} keyboardType="decimal-pad" />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="ELEV. GAIN (M)" placeholder="0" value={elevationGain} onChangeText={setElevationGain} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="DURATION (MIN)" placeholder="0" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" />
                </View>
                <View style={styles.metaField} />
              </View>
            </View>
          )}

          {/* Toggles */}
          <View style={styles.fieldGroup}>
            <View style={[styles.toggleRow, { borderColor: colors.border }]}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>NOTES</Text>
                <Text style={[styles.toggleDesc, { color: colors.textTertiary }]}>Allow notes on this entry</Text>
              </View>
              <Switch
                value={commentsEnabled}
                onValueChange={setCommentsEnabled}
                trackColor={{ false: colors.border, true: brandColors.copper }}
                thumbColor="#fff"
              />
            </View>
            {selectedExpedition && (
              <View style={[styles.toggleRow, { borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>MILESTONE</Text>
                  <Text style={[styles.toggleDesc, { color: colors.textTertiary }]}>Mark as a significant event</Text>
                </View>
                <Switch
                  value={isMilestone}
                  onValueChange={setIsMilestone}
                  trackColor={{ false: colors.border, true: brandColors.copper }}
                  thumbColor="#fff"
                />
              </View>
            )}
          </View>

          {/* Visibility — only for standalone entries; expedition entries inherit */}
          {selectedExpedition ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>VISIBILITY</Text>
              <View style={[styles.visibilityNote, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.visibilityNoteText, { color: colors.textTertiary }]}>
                  Inherited from expedition — {selectedExp?.visibility?.toUpperCase() ?? 'PUBLIC'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>VISIBILITY</Text>
              {VISIBILITY_OPTIONS.map((opt, i) => (
                <RadioOption
                  key={opt.label}
                  label={opt.label}
                  description={opt.description}
                  selected={visibility === i}
                  onSelect={() => setVisibility(i)}
                />
              ))}
            </View>
          )}
            </View>
          </HCard>

          <View style={styles.actions}>
            <HButton variant="copper" onPress={() => handlePublish(false)} disabled={submitting}>
              {submitting ? 'PUBLISHING...' : 'PUBLISH ENTRY'}
            </HButton>
            <View style={styles.gap} />
            <HButton variant="copper" outline onPress={() => handlePublish(true)} disabled={submitting}>
              SAVE AS DRAFT
            </HButton>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={handleLocationSelect}
        initialLat={lat}
        initialLon={lon}
        initialPlace={location}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  form: { padding: 16 },
  formInner: { padding: 14 },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  wordCount: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  selector: {
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerDropdown: {
    borderWidth: borders.thick,
    borderTopWidth: 0,
    maxHeight: 200,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  textarea: {
    borderWidth: borders.thick,
    padding: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    lineHeight: 26,
    minHeight: 140,
  },
  actions: {
    marginTop: 8,
  },
  gap: { height: 8 },
  saveBtn: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.copper,
  },
  waypointItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waypointDot: { width: 8, height: 8, borderRadius: 4 },
  waypointItemInfo: { flex: 1 },
  waypointCoords: { fontFamily: mono, fontSize: 11, fontWeight: '600', marginTop: 1 },
  waypointLocked: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1 },
  waypointLockedText: { fontFamily: mono, fontSize: 11, fontWeight: '600', flex: 1 },
  locationBox: { padding: 12, paddingHorizontal: 14, borderWidth: borders.thick, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  locationInfo: { flex: 1, minWidth: 0 },
  locationNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationName: { fontSize: 15, fontWeight: '600' },
  locationCoords: { fontFamily: mono, fontSize: 12, fontWeight: '600', marginTop: 2 },
  locationChange: { fontFamily: mono, fontSize: 12, fontWeight: '700', color: brandColors.copper },
  visibilityNote: {
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
  },
  visibilityNoteText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '600',
  },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaField: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  toggleDesc: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  dateConfirm: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dateConfirmText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.copper,
  },
  spacer: { height: 32 },
});
