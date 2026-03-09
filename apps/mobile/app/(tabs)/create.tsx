import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Pressable,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
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
import { PhotoGrid } from '@/components/ui/PhotoGrid';
import { RadioOption } from '@/components/ui/RadioOption';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { Svg, Path, Circle } from 'react-native-svg';
import { entryApi, uploadApi } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';

const VISIBILITY_OPTIONS = [
  { label: 'PUBLIC', description: 'Visible to all' },
  { label: 'OFF-GRID', description: 'Hidden from feeds' },
  { label: 'PRIVATE', description: 'Only you can see this' },
];

export default function CreateScreen() {
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedExpedition, setSelectedExpedition] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showExpPicker, setShowExpPicker] = useState(false);

  const { data: tripsData } = useApi<{ data: Expedition[]; results: number }>(
    ready ? '/user/trips' : null,
  );
  const expeditions = tripsData?.data ?? [];

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
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePublish = useCallback(async (isDraft: boolean) => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your entry.');
      return;
    }
    setSubmitting(true);
    try {
      const entryData: Record<string, unknown> = {
        title: title.trim(),
        content: body.trim(),
        place: location.trim() || undefined,
        lat: lat ?? undefined,
        lon: lon ?? undefined,
        visibility: VISIBILITY_OPTIONS[visibility].label.toLowerCase(),
        isDraft: isDraft,
        trip_id: selectedExpedition ?? undefined,
      };
      await entryApi.createEntry(entryData);
      Alert.alert(
        isDraft ? 'Draft saved' : 'Entry published',
        undefined,
        [{ text: 'OK', onPress: () => { setTitle(''); setBody(''); setLocation(''); setLat(null); setLon(null); setPhotos([]); } }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save entry');
    } finally {
      setSubmitting(false);
    }
  }, [title, body, location, visibility, selectedExpedition]);

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  const selectedExp = expeditions.find((e) => e.id === selectedExpedition);

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

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <HCard>
            <View style={styles.formInner}>
          {/* Expedition selector */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>EXPEDITION</Text>
            <TouchableOpacity
              style={[styles.selector, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
              onPress={() => setShowExpPicker(!showExpPicker)}
            >
              <Text style={[styles.selectorText, { color: selectedExp ? colors.text : colors.textTertiary }]}>
                {selectedExp?.title ?? 'Select an expedition'}
              </Text>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                <Path d="M6 9l6 6 6-6" />
              </Svg>
            </TouchableOpacity>
            {showExpPicker && (
              <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                    onPress={() => { setSelectedExpedition(exp.id); setShowExpPicker(false); }}
                  >
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>{exp.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <HTextField label="TITLE" placeholder="Give your entry a title" value={title} onChangeText={setTitle} />

          {/* Photos */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>PHOTOS</Text>
            <PhotoGrid photos={photos} onAdd={handleAddPhoto} onRemove={handleRemovePhoto} />
          </View>

          {/* Content */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>CONTENT</Text>
            {/* Rich text toolbar */}
            <View style={[styles.toolbar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              {['B', 'I', 'U', 'H1', 'H2', '\u201C', '\u2014', '\u2022', '#'].map((btn) => (
                <Pressable key={btn} style={[styles.toolbarBtn, { borderRightColor: colors.borderThin }]}>
                  <Text style={[
                    styles.toolbarBtnText,
                    { color: colors.textTertiary },
                    btn === 'B' && { fontWeight: '700' },
                    btn === 'I' && { fontStyle: 'italic' },
                    btn === 'U' && { textDecorationLine: 'underline' },
                  ]}>
                    {btn}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text, borderTopWidth: 0 }]}
              multiline
              placeholder="Write your journal entry..."
              placeholderTextColor={colors.textTertiary}
              value={body}
              onChangeText={setBody}
              textAlignVertical="top"
            />
          </View>

          {/* Location */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>LOCATION</Text>
            <Pressable style={[styles.locationBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <View>
                <View style={styles.locationNameRow}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2.5}>
                    <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <Circle cx={12} cy={10} r={3} />
                  </Svg>
                  <Text style={[styles.locationName, { color: colors.text }]}>{location || 'Set location'}</Text>
                </View>
                {location && lat != null && lon != null ? (
                  <Text style={[styles.locationCoords, { color: colors.textTertiary }]}>
                    {Math.abs(lat).toFixed(2)}{lat >= 0 ? 'N' : 'S'} / {Math.abs(lon).toFixed(2)}{lon >= 0 ? 'E' : 'W'}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.locationChange}>CHANGE</Text>
            </Pressable>
          </View>

          {/* Visibility */}
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
  toolbar: { flexDirection: 'row', borderWidth: borders.thick, borderBottomWidth: 0 },
  toolbarBtn: { paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1 },
  toolbarBtnText: { fontFamily: mono, fontSize: 13 },
  locationBox: { padding: 12, paddingHorizontal: 14, borderWidth: borders.thick, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationName: { fontSize: 15, fontWeight: '600' },
  locationCoords: { fontFamily: mono, fontSize: 12, fontWeight: '600', marginTop: 2 },
  locationChange: { fontFamily: mono, fontSize: 12, fontWeight: '700', color: brandColors.copper },
  spacer: { height: 32 },
});
