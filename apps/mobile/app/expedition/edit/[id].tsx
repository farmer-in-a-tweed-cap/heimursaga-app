import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useApi } from '@/hooks/useApi';
import { expeditionApi } from '@/services/api';
import { NavBar } from '@/components/ui/NavBar';
import { HTextField } from '@/components/ui/HTextField';
import { HButton } from '@/components/ui/HButton';
import { HCard } from '@/components/ui/HCard';
import { RadioOption } from '@/components/ui/RadioOption';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import type { Expedition } from '@/types/api';

const CATEGORIES = ['OVERLAND', 'TRAIL', 'CYCLING', 'SAILING', 'PADDLING', 'FLIGHT'];
const CONTINENTS = ['AFRICA', 'ASIA', 'EUROPE', 'N. AMERICA', 'S. AMERICA', 'OCEANIA', 'ANTARCTICA'];
const VISIBILITY_OPTIONS = [
  { label: 'PUBLIC', desc: 'Visible to all explorers' },
  { label: 'UNLISTED', desc: 'Only accessible via direct link' },
  { label: 'PRIVATE', desc: 'Only you can see this' },
];

export default function EditExpeditionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const { data: expedition, loading } = useApi<Expedition>(
    ready && id ? `/trips/${id}` : null,
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCat, setSelectedCat] = useState(-1);
  const [selectedRegion, setSelectedRegion] = useState(-1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState(0);
  const [fundingGoal, setFundingGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!expedition) return;
    setTitle(expedition.title);
    setDescription(expedition.description ?? '');
    if (expedition.category) {
      const catIdx = CATEGORIES.findIndex(c => c.toLowerCase() === expedition.category!.toLowerCase());
      if (catIdx >= 0) setSelectedCat(catIdx);
    }
    if (expedition.region) {
      const regIdx = CONTINENTS.findIndex(c => c.toLowerCase() === expedition.region!.toLowerCase());
      if (regIdx >= 0) setSelectedRegion(regIdx);
    }
    if (expedition.startDate) setStartDate(expedition.startDate.split('T')[0]);
    if (expedition.endDate) setEndDate(expedition.endDate.split('T')[0]);
    if (expedition.visibility) {
      const visIdx = VISIBILITY_OPTIONS.findIndex(v => v.label.toLowerCase() === expedition.visibility);
      if (visIdx >= 0) setVisibility(visIdx);
    }
    if (expedition.goal) setFundingGoal(String(expedition.goal));
  }, [expedition]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your expedition.');
      return;
    }
    setSubmitting(true);
    try {
      await expeditionApi.updateExpedition(Number(id), {
        title: title.trim(),
        description: description.trim() || undefined,
        category: selectedCat >= 0 ? CATEGORIES[selectedCat].toLowerCase() : undefined,
        region: selectedRegion >= 0 ? CONTINENTS[selectedRegion].toLowerCase() : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        visibility: VISIBILITY_OPTIONS[visibility].label.toLowerCase() as Expedition['visibility'],
        goal: fundingGoal ? Number(fundingGoal) : undefined,
      });
      Alert.alert('Saved', 'Expedition updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update expedition');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || loading || !expedition) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="EDIT EXPEDITION" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="EDIT EXPEDITION" />

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <HCard>
            <View style={styles.formInner}>
              <HTextField label="TITLE" placeholder="Expedition name" value={title} onChangeText={setTitle} />

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
                <HTextField
                  label="DESCRIPTION"
                  placeholder="Describe your expedition"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
                <View style={styles.chipRow}>
                  {CATEGORIES.map((cat, i) => (
                    <View
                      key={cat}
                      style={[
                        styles.chip,
                        {
                          borderColor: selectedCat === i ? brandColors.copper : colors.border,
                          backgroundColor: selectedCat === i ? brandColors.copper : colors.inputBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: selectedCat === i ? '#fff' : colors.textSecondary }]}
                        onPress={() => setSelectedCat(selectedCat === i ? -1 : i)}
                      >
                        {cat}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>REGION</Text>
                <View style={styles.chipRow}>
                  {CONTINENTS.map((cont, i) => (
                    <View
                      key={cont}
                      style={[
                        styles.chip,
                        {
                          borderColor: selectedRegion === i ? brandColors.copper : colors.border,
                          backgroundColor: selectedRegion === i ? brandColors.copper : colors.inputBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: selectedRegion === i ? '#fff' : colors.textSecondary }]}
                        onPress={() => setSelectedRegion(selectedRegion === i ? -1 : i)}
                      >
                        {cont}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <HTextField label="START DATE" placeholder="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
                </View>
                <View style={styles.dateField}>
                  <HTextField label="END DATE" placeholder="YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>VISIBILITY</Text>
                {VISIBILITY_OPTIONS.map((opt, i) => (
                  <RadioOption
                    key={opt.label}
                    label={opt.label}
                    description={opt.desc}
                    selected={visibility === i}
                    onSelect={() => setVisibility(i)}
                  />
                ))}
              </View>

              <HTextField
                label="FUNDING GOAL ($)"
                placeholder="0"
                value={fundingGoal}
                onChangeText={setFundingGoal}
                keyboardType="numeric"
              />
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: borders.thick,
  },
  chipText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  dateField: { flex: 1 },
  actions: { marginTop: 8 },
  spacer: { height: 32 },
});
