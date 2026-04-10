import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Pressable,
  ActivityIndicator, Alert, Platform, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarPicker, fmtDateISO, fmtDateDisplay, todayISO } from '@/components/ui/CalendarPicker';
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available
}
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { entryApi, uploadApi, ApiError } from '@/services/api';
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
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Entry } from '@/types/api';

const VISIBILITY_OPTIONS = [
  { label: 'PUBLIC', description: 'Visible to all' },
  { label: 'OFF-GRID', description: 'Hidden from feeds' },
  { label: 'PRIVATE', description: 'Only you can see this' },
];

const ENTRY_TYPES = ['STANDARD', 'PHOTO', 'VIDEO', 'DATA'];
const ENTRY_TYPE_VALUES = ['standard', 'photo', 'video', 'data'] as const;

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resolvedId = Array.isArray(id) ? id[0] : id;
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const { data: entry, loading } = useApi<Entry>(
    ready && id ? `/posts/${id}` : null,
  );

  // Core fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [visibility, setVisibility] = useState(0);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Entry type & date/time
  const [entryType, setEntryType] = useState(0);
  const [dateStr, setDateStr] = useState(() => todayISO());
  const [timeStr, setTimeStr] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Toggles
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isMilestone, setIsMilestone] = useState(false);

  // Video URL
  const [videoUrl, setVideoUrl] = useState('');

  // Metadata (data type)
  const [distanceTraveled, setDistanceTraveled] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [pressure, setPressure] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [duration, setDuration] = useState('');
  const [avgSpeed, setAvgSpeed] = useState('');

  // Marine data (data type + sail/paddle mode)
  const [waveHeight, setWaveHeight] = useState('');
  const [waterTemp, setWaterTemp] = useState('');
  const [seaState, setSeaState] = useState('');
  const [tidalState, setTidalState] = useState('');
  const [heading, setHeading] = useState('');
  const [currentSpeed, setCurrentSpeed] = useState('');
  const [sailConfig, setSailConfig] = useState('');

  const [hydrated, setHydrated] = useState(false);

  // ─── Hydrate from entry data ────────────────────────────────────────────────

  useEffect(() => {
    if (!entry || hydrated) return;
    setHydrated(true);
    setTitle(entry.title ?? '');
    setBody(entry.content ?? '');
    setLocation(entry.place ?? '');
    if (entry.lat != null) setLat(entry.lat);
    if (entry.lon != null) setLon(entry.lon);
    if (entry.date) {
      setDateStr(entry.date.split('T')[0]);
      const timePart = entry.date.split('T')[1];
      if (timePart) setTimeStr(timePart.slice(0, 5));
    }
    if (entry.commentsEnabled === false) setCommentsEnabled(false);
    if (entry.isMilestone) setIsMilestone(true);
    if (entry.entryType) {
      const idx = ENTRY_TYPE_VALUES.indexOf(entry.entryType as any);
      if (idx >= 0) setEntryType(idx);
    }
    if (entry.visibility) {
      const visIdx = VISIBILITY_OPTIONS.findIndex(v => v.label.toLowerCase() === entry.visibility?.toLowerCase());
      if (visIdx >= 0) setVisibility(visIdx);
    }
    // Restore media
    if (entry.media && entry.media.length > 0) {
      setPhotos(entry.media.map((m, i) => ({
        _id: `existing_${i}`,
        uri: m.original ?? m.url ?? m.thumbnail ?? '',
        uploadId: m.id,
        thumbnail: m.thumbnail,
      })));
      // Find cover image index
      if (entry.coverImage) {
        const coverIdx = entry.media.findIndex(m =>
          m.original === entry.coverImage || m.url === entry.coverImage || m.thumbnail === entry.coverImage,
        );
        if (coverIdx >= 0) setCoverIndex(coverIdx);
      }
    }
    // Restore metadata
    const meta = (entry as any).metadata;
    if (meta) {
      if (meta.temperature != null) setTemperature(String(meta.temperature));
      if (meta.humidity != null) setHumidity(String(meta.humidity));
      if (meta.windSpeed != null) setWindSpeed(String(meta.windSpeed));
      if (meta.pressure != null) setPressure(String(meta.pressure));
      if (meta.elevationGain != null) setElevationGain(String(meta.elevationGain));
      if (meta.duration != null) setDuration(String(meta.duration));
      if (meta.distanceTraveled != null) setDistanceTraveled(String(meta.distanceTraveled));
      else if (meta.distanceCovered != null) setDistanceTraveled(String(meta.distanceCovered));
      if (meta.avgSpeed != null) setAvgSpeed(String(meta.avgSpeed));
      if (meta.videoUrl) setVideoUrl(String(meta.videoUrl));
      // Marine data
      if (meta.waveHeight != null) setWaveHeight(String(meta.waveHeight));
      if (meta.waterTemp != null) setWaterTemp(String(meta.waterTemp));
      if (meta.seaState) setSeaState(String(meta.seaState));
      if (meta.tidalState) setTidalState(String(meta.tidalState));
      if (meta.heading != null) setHeading(String(meta.heading));
      if (meta.currentSpeed != null) setCurrentSpeed(String(meta.currentSpeed));
      if (meta.sailConfig) setSailConfig(String(meta.sailConfig));
    }
  }, [entry, hydrated]);

  // ─── Expedition info (read-only) ───────────────────────────────────────────

  const expeditionTitle = entry?.trip?.title ?? entry?.expedition?.title;
  const expeditionVisibility = entry?.trip?.visibility ?? 'public';
  const expeditionMode = (entry as any)?.trip?.mode ?? (entry as any)?.expedition?.mode;
  const isExpeditionEntry = !!expeditionTitle;
  const isSailMode = expeditionMode === 'sail' || expeditionMode === 'paddle';

  // ─── Photo Upload ──────────────────────────────────────────────────────────

  const nextPhotoId = useRef(0);

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
      const photoId = `photo_${nextPhotoId.current++}`;
      const newPhoto: PhotoItem = { _id: photoId, uri, uploading: true };
      setPhotos((prev) => [...prev, newPhoto]);

      try {
        const uploadResult = await uploadApi.upload(uri);
        setPhotos((prev) =>
          prev.map((p) =>
            p._id === photoId
              ? { ...p, uploadId: uploadResult.uploadId, thumbnail: uploadResult.thumbnail, uploading: false }
              : p,
          ),
        );
      } catch {
        setPhotos((prev) =>
          prev.map((p) =>
            p._id === photoId ? { ...p, uploading: false, failed: true } : p,
          ),
        );
      }
    }
  }, []);

  const handleRetryUpload = useCallback((index: number) => {
    setPhotos((prev) => {
      const photo = prev[index];
      if (!photo) return prev;
      const photoId = photo._id;
      const updated = prev.map((p) => (p._id === photoId ? { ...p, uploading: true, failed: false } : p));

      uploadApi.upload(photo.uri).then((uploadResult) => {
        setPhotos((cur) =>
          cur.map((p) =>
            p._id === photoId
              ? { ...p, uploadId: uploadResult.uploadId, thumbnail: uploadResult.thumbnail, uploading: false }
              : p,
          ),
        );
      }).catch(() => {
        setPhotos((cur) =>
          cur.map((p) => (p._id === photoId ? { ...p, uploading: false, failed: true } : p)),
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

  // ─── Location ──────────────────────────────────────────────────────────────

  const handleLocationSelect = useCallback((data: { place: string; lat: number; lon: number }) => {
    setLocation(data.place);
    setLat(data.lat);
    setLon(data.lon);
  }, []);

  // ─── Date ──────────────────────────────────────────────────────────────────

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your entry.');
      return;
    }

    const pendingUploads = photos.some((p) => p.uploading);
    if (pendingUploads) {
      Alert.alert('Uploads in progress', 'Please wait for photos to finish uploading.');
      return;
    }

    const failedUploads = photos.some((p) => p.failed);
    if (failedUploads) {
      Alert.alert('Upload failed', 'Some photos failed to upload. Remove or retry them before saving.');
      return;
    }

    setSubmitting(true);
    try {
      const uploads = photos.map((p) => p.uploadId).filter((uid): uid is string => !!uid);
      const coverUploadId = photos[coverIndex]?.uploadId ?? undefined;

      const safeFloat = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : undefined; };

      const metadata: Record<string, unknown> = {};
      const typeValue = ENTRY_TYPE_VALUES[entryType];

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
        const spd = safeFloat(avgSpeed); if (spd !== undefined) metadata.avgSpeed = spd;
        // Marine data
        const wh = safeFloat(waveHeight); if (wh !== undefined) metadata.waveHeight = wh;
        const wt = safeFloat(waterTemp); if (wt !== undefined) metadata.waterTemp = wt;
        if (seaState.trim()) metadata.seaState = seaState.trim();
        if (tidalState.trim()) metadata.tidalState = tidalState.trim();
        const hdg = safeFloat(heading); if (hdg !== undefined) metadata.heading = hdg;
        const cs = safeFloat(currentSpeed); if (cs !== undefined) metadata.currentSpeed = cs;
        if (sailConfig.trim()) metadata.sailConfig = sailConfig.trim();
      }

      const entryData: Record<string, unknown> = {
        title: title.trim(),
        content: body.trim(),
        place: location.trim() || undefined,
        lat: lat ?? undefined,
        lon: lon ?? undefined,
        date: timeStr ? `${dateStr}T${timeStr}` : dateStr,
        visibility: isExpeditionEntry ? undefined : VISIBILITY_OPTIONS[visibility].label.toLowerCase(),
        entryType: typeValue,
        commentsEnabled,
        isMilestone,
        uploads: uploads.length > 0 ? uploads : undefined,
        coverUploadId,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      await entryApi.updateEntry(resolvedId!, entryData as Partial<Entry>);
      Alert.alert('Saved', 'Entry updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    title, body, location, visibility, lat, lon, dateStr, timeStr, id,
    photos, coverIndex, entryType, commentsEnabled, isMilestone, isExpeditionEntry,
    videoUrl, distanceTraveled, temperature, humidity, windSpeed, pressure, elevationGain, duration, avgSpeed,
    waveHeight, waterTemp, seaState, tidalState, heading, currentSpeed, sailConfig,
    router,
  ]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!ready || loading || !entry) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="EDIT ENTRY" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const typeValue = ENTRY_TYPE_VALUES[entryType];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="EDIT ENTRY" />

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

          {/* Expedition (read-only) */}
          {expeditionTitle && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>EXPEDITION</Text>
              <View style={[styles.readOnly, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.readOnlyText, { color: colors.textTertiary }]}>{expeditionTitle}</Text>
              </View>
            </View>
          )}

          <HTextField label="TITLE" placeholder="Give your entry a title" value={title} onChangeText={setTitle} />

          {/* Date & time */}
          <View style={styles.fieldGroup}>
            <View style={styles.metaRow}>
              <View style={{ flex: 1 }}>
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
              </View>
              <View style={{ flex: 1 }}>
                <HTextField
                  label="TIME"
                  placeholder="HH:MM"
                  value={timeStr}
                  onChangeText={(t) => setTimeStr(t.replace(/[^0-9:]/g, '').slice(0, 5))}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <CalendarPicker
              visible={showDatePicker}
              value={dateStr}
              maxDate={todayISO()}
              onSelect={setDateStr}
              onClose={() => setShowDatePicker(false)}
            />
          </View>

          {/* Location — only for standalone entries */}
          {!isExpeditionEntry && (
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
                  <HTextField label="DURATION (HRS)" placeholder="0" value={duration} onChangeText={setDuration} keyboardType="decimal-pad" />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="AVG. SPEED (KN)" placeholder="0" value={avgSpeed} onChangeText={setAvgSpeed} keyboardType="decimal-pad" />
                </View>
              </View>
            </View>
          )}

          {typeValue === 'data' && isSailMode && (
            <View style={styles.fieldGroup}>
              <SectionDivider title="MARINE DATA" />
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="WAVE HEIGHT (M)" placeholder="0" value={waveHeight} onChangeText={setWaveHeight} keyboardType="decimal-pad" />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="WATER TEMP (\u00B0C)" placeholder="0" value={waterTemp} onChangeText={setWaterTemp} keyboardType="decimal-pad" />
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="SEA STATE" placeholder="Calm, Moderate..." value={seaState} onChangeText={setSeaState} />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="TIDAL STATE" placeholder="High, Low..." value={tidalState} onChangeText={setTidalState} />
                </View>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaField}>
                  <HTextField label="HEADING (\u00B0)" placeholder="0" value={heading} onChangeText={setHeading} keyboardType="decimal-pad" />
                </View>
                <View style={styles.metaField}>
                  <HTextField label="CURRENT (KN)" placeholder="0" value={currentSpeed} onChangeText={setCurrentSpeed} keyboardType="decimal-pad" />
                </View>
              </View>
              <HTextField label="SAIL CONFIGURATION" placeholder="Main + jib, reefed..." value={sailConfig} onChangeText={setSailConfig} />
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
            {isExpeditionEntry && (
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

          {/* Visibility */}
          {isExpeditionEntry ? (
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>VISIBILITY</Text>
              <View style={[styles.visibilityNote, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <Text style={[styles.visibilityNoteText, { color: colors.textTertiary }]}>
                  Inherited from expedition — {expeditionVisibility.toUpperCase()}
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
            <HButton variant="copper" onPress={handleSave} disabled={submitting}>
              {submitting ? 'SAVING...' : 'SAVE CHANGES'}
            </HButton>
          </View>

          <View style={styles.deleteWrap}>
            <Pressable
              style={[styles.deleteBtn, { borderColor: brandColors.red }]}
              onPress={() => {
                Alert.alert(
                  'Delete Entry',
                  'This action cannot be undone. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await entryApi.deleteEntry(resolvedId as any);
                          router.dismiss(2);
                        } catch (err: any) {
                          Alert.alert('Error', err.message ?? 'Failed to delete entry');
                        }
                      },
                    },
                  ],
                );
              }}
            >
              <Text style={styles.deleteBtnText}>DELETE ENTRY</Text>
            </Pressable>
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
  readOnly: {
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
  },
  readOnlyText: {
    fontSize: 15,
    fontWeight: '600',
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
  textarea: {
    borderWidth: borders.thick,
    padding: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    lineHeight: 26,
    minHeight: 140,
  },
  actions: { marginTop: 8 },
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
  deleteWrap: {
    paddingTop: 24,
  },
  deleteBtn: {
    borderWidth: borders.thick,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: brandColors.red,
  },
  spacer: { height: 32 },
});
