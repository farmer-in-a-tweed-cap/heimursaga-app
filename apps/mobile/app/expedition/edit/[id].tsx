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
import { GEO_REGION_GROUPS, EXPEDITION_CATEGORIES } from '@/constants/geoRegions';
import type { Expedition } from '@/types/api';
const VISIBILITY_OPTIONS = [
  { label: 'PUBLIC', desc: 'Visible to all explorers' },
  { label: 'OFF-GRID', desc: 'Only accessible via direct link' },
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
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState(0);
  const [fundingGoal, setFundingGoal] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!expedition) return;
    setTitle(expedition.title);
    setDescription(expedition.description ?? '');
    if (expedition.category) setSelectedCat(expedition.category);
    if (expedition.region) {
      setSelectedRegions(expedition.region.split(',').map((r: string) => r.trim()).filter(Boolean));
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
      await expeditionApi.updateExpedition(id!, {
        title: title.trim(),
        description: description.trim() || undefined,
        category: selectedCat || undefined,
        region: selectedRegions.length > 0 ? selectedRegions.join(', ') : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        visibility: VISIBILITY_OPTIONS[visibility].label.toLowerCase() as Expedition['visibility'],
        goal: fundingGoal ? Number(fundingGoal) : undefined,
      });
      Alert.alert('Saved', 'Expedition updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update expedition';
      Alert.alert('Error', msg);
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
                  {EXPEDITION_CATEGORIES.map((cat) => (
                    <View
                      key={cat}
                      style={[
                        styles.chip,
                        {
                          borderColor: selectedCat === cat ? brandColors.copper : colors.border,
                          backgroundColor: selectedCat === cat ? brandColors.copper : colors.inputBackground,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: selectedCat === cat ? '#fff' : colors.textSecondary }]}
                        onPress={() => setSelectedCat(selectedCat === cat ? '' : cat)}
                      >
                        {cat.toUpperCase()}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>REGION</Text>
                {GEO_REGION_GROUPS.map((group) => (
                  <View key={group.label} style={styles.regionGroup}>
                    <Text style={[styles.regionGroupLabel, { color: colors.textTertiary }]}>
                      {group.label.toUpperCase()}
                    </Text>
                    <View style={styles.chipRow}>
                      {group.regions.map((r) => {
                        const selected = selectedRegions.includes(r);
                        return (
                          <View
                            key={r}
                            style={[
                              styles.chip,
                              {
                                borderColor: selected ? brandColors.blue : colors.border,
                                backgroundColor: selected ? brandColors.blue : colors.inputBackground,
                              },
                            ]}
                          >
                            <Text
                              style={[styles.chipText, { color: selected ? '#fff' : colors.textSecondary }]}
                              onPress={() =>
                                setSelectedRegions((prev) =>
                                  selected ? prev.filter((v) => v !== r) : [...prev, r],
                                )
                              }
                            >
                              {r.toUpperCase()}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
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
  regionGroup: {
    marginBottom: 12,
  },
  regionGroupLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
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
