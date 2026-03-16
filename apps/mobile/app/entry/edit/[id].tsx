import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Pressable,
  ActivityIndicator, Alert, Platform, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
let ImagePicker: typeof import('expo-image-picker') | null = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Native module not available
}
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { entryApi, uploadApi } from '@/services/api';
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

const ENTRY_TYPES = ['STANDARD', 'PHOTO ESSAY', 'DATA LOG'];
const ENTRY_TYPE_VALUES = ['standard', 'photo-essay', 'data-log'] as const;

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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

  // Entry type & date
  const [entryType, setEntryType] = useState(0);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Toggles
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [isMilestone, setIsMilestone] = useState(false);

  // Metadata (standard / photo-essay)
  const [weather, setWeather] = useState('');
  const [mood, setMood] = useState('');
  const [distanceTraveled, setDistanceTraveled] = useState('');
  const [expenses, setExpenses] = useState('');

  // Metadata (data-log)
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [windSpeed, setWindSpeed] = useState('');
  const [pressure, setPressure] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [duration, setDuration] = useState('');

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
    if (entry.date) setDate(new Date(entry.date));
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
      if (meta.weather) setWeather(String(meta.weather));
      if (meta.mood) setMood(String(meta.mood));
      if (meta.distanceTraveled != null) setDistanceTraveled(String(meta.distanceTraveled));
      if (meta.expenses != null) setExpenses(String(meta.expenses));
      if (meta.temperature != null) setTemperature(String(meta.temperature));
      if (meta.humidity != null) setHumidity(String(meta.humidity));
      if (meta.windSpeed != null) setWindSpeed(String(meta.windSpeed));
      if (meta.pressure != null) setPressure(String(meta.pressure));
      if (meta.elevationGain != null) setElevationGain(String(meta.elevationGain));
      if (meta.duration != null) setDuration(String(meta.duration));
      if (meta.distanceCovered != null && !meta.distanceTraveled) setDistanceTraveled(String(meta.distanceCovered));
    }
  }, [entry, hydrated]);

  // ─── Expedition info (read-only) ───────────────────────────────────────────

  const expeditionTitle = entry?.trip?.title ?? entry?.expedition?.title;
  const expeditionVisibility = entry?.trip?.visibility ?? 'public';
  const isExpeditionEntry = !!expeditionTitle;

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

  const handleDateChange = useCallback((_: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  }, []);

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

      if (typeValue === 'standard' || typeValue === 'photo-essay') {
        if (weather.trim()) metadata.weather = weather.trim();
        if (mood.trim()) metadata.mood = mood.trim();
        const dist = safeFloat(distanceTraveled); if (dist !== undefined) metadata.distanceTraveled = dist;
        const exp = safeFloat(expenses); if (exp !== undefined) metadata.expenses = exp;
      }
      if (typeValue === 'data-log') {
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
        date: date.toISOString().split('T')[0],
        visibility: isExpeditionEntry ? undefined : VISIBILITY_OPTIONS[visibility].label.toLowerCase(),
        entryType: typeValue,
        commentsEnabled,
        isMilestone,
        uploads: uploads.length > 0 ? uploads : undefined,
        coverUploadId,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      await entryApi.updateEntry(id!, entryData as Partial<Entry>);
      Alert.alert('Saved', 'Entry updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update entry');
    } finally {
      setSubmitting(false);
    }
  }, [
    title, body, location, visibility, lat, lon, date, id,
    photos, coverIndex, entryType, commentsEnabled, isMilestone, isExpeditionEntry,
    weather, mood, distanceTraveled, expenses,
    temperature, humidity, windSpeed, pressure, elevationGain, duration,
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

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
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

          {/* Date picker */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>DATE</Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.selectorText, { color: colors.text }]}>
                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
              </Svg>
            </TouchableOpacity>
            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  themeVariant={dark ? 'dark' : 'light'}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.dateConfirm} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateConfirmText}>DONE</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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

          {/* Type-specific metadata */}
          {(typeValue === 'standard' || typeValue === 'photo-essay') && (
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

          {typeValue === 'data-log' && (
            <View style={styles.fieldGroup}>
              <SectionDivider title="DATA LOG FIELDS" />
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
  spacer: { height: 32 },
});
