import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { entryApi } from '@/services/api';
import { NavBar } from '@/components/ui/NavBar';
import { HTextField } from '@/components/ui/HTextField';
import { HButton } from '@/components/ui/HButton';
import { HCard } from '@/components/ui/HCard';
import { RadioOption } from '@/components/ui/RadioOption';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Entry } from '@/types/api';

const VISIBILITY_OPTIONS = [
  { label: 'PUBLIC', description: 'Visible to all' },
  { label: 'OFF-GRID', description: 'Hidden from feeds' },
  { label: 'PRIVATE', description: 'Only you can see this' },
];

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const { data: entry, loading } = useApi<Entry>(
    ready && id ? `/posts/${id}` : null,
  );

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [place, setPlace] = useState('');
  const [visibility, setVisibility] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setTitle(entry.title);
    setContent(entry.content ?? '');
    setPlace(entry.place ?? '');
    if (entry.visibility) {
      const visIdx = VISIBILITY_OPTIONS.findIndex(v => v.label.toLowerCase() === entry.visibility?.toLowerCase());
      if (visIdx >= 0) setVisibility(visIdx);
    }
  }, [entry]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your entry.');
      return;
    }
    setSubmitting(true);
    try {
      await entryApi.updateEntry(Number(id), {
        title: title.trim(),
        content: content.trim() || undefined,
        place: place.trim() || undefined,
        visibility: VISIBILITY_OPTIONS[visibility].label.toLowerCase(),
      } as Partial<Entry>);
      Alert.alert('Saved', 'Entry updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || loading || !entry) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="EDIT ENTRY" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  const expeditionTitle = entry.trip?.title ?? entry.expedition?.title;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="EDIT ENTRY" />

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <HCard>
            <View style={styles.formInner}>
              {expeditionTitle && (
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>EXPEDITION</Text>
                  <View style={[styles.readOnly, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <Text style={[styles.readOnlyText, { color: colors.textTertiary }]}>{expeditionTitle}</Text>
                  </View>
                </View>
              )}

              <HTextField label="TITLE" placeholder="Entry title" value={title} onChangeText={setTitle} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CONTENT</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                  multiline
                  placeholder="Write your journal entry..."
                  placeholderTextColor={colors.textTertiary}
                  value={content}
                  onChangeText={setContent}
                  textAlignVertical="top"
                />
              </View>

              <HTextField label="LOCATION" placeholder="Where are you?" value={place} onChangeText={setPlace} />

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
            <HButton variant="copper" onPress={handleSave} disabled={submitting}>
              {submitting ? 'SAVING...' : 'SAVE CHANGES'}
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
  readOnly: {
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
  },
  readOnlyText: {
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
  actions: { marginTop: 8 },
  spacer: { height: 32 },
});
