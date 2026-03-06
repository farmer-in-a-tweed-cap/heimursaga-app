import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { NavBar } from '@/components/ui/NavBar';
import { HTextField } from '@/components/ui/HTextField';
import { HButton } from '@/components/ui/HButton';
import { HCard } from '@/components/ui/HCard';
import { RadioOption } from '@/components/ui/RadioOption';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import HeimuMap, { WaypointMarker } from '@/components/map/HeimuMap';
import { SearchBar } from '@/components/ui/SearchBar';
import { Svg, Path } from 'react-native-svg';
import { expeditionApi } from '@/services/api';
import { mono, colors as brandColors, borders } from '@/theme/tokens';

const STEPS = ['DETAILS', 'ROUTE', 'FUNDING', 'REVIEW'];
const CATEGORIES = ['OVERLAND', 'TRAIL', 'CYCLING', 'SAILING', 'PADDLING', 'FLIGHT'];
const CONTINENTS = ['AFRICA', 'ASIA', 'EUROPE', 'N. AMERICA', 'S. AMERICA', 'OCEANIA', 'ANTARCTICA'];
const VISIBILITY_OPTIONS = [
  { label: 'PUBLIC', desc: 'Visible to all explorers' },
  { label: 'UNLISTED', desc: 'Only accessible via direct link' },
  { label: 'PRIVATE', desc: 'Only you can see this' },
];

interface WaypointEntry {
  name: string;
  type: 'origin' | 'waypoint' | 'destination';
  coords?: string;
}

export default function ExpeditionBuilderScreen() {
  const { dark, colors } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCat, setSelectedCat] = useState(-1);
  const [selectedRegion, setSelectedRegion] = useState(-1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState(0);

  // Step 2 state
  const [waypoints, setWaypoints] = useState<WaypointEntry[]>([]);
  const [waypointSearch, setWaypointSearch] = useState('');

  // Step 3 state
  const [fundingEnabled, setFundingEnabled] = useState(false);
  const [fundingGoal, setFundingGoal] = useState('');

  const addWaypoint = useCallback(() => {
    if (!waypointSearch.trim()) return;
    const type: WaypointEntry['type'] = waypoints.length === 0 ? 'origin' : 'waypoint';
    setWaypoints((prev) => [...prev, { name: waypointSearch.trim(), type }]);
    setWaypointSearch('');
  }, [waypointSearch, waypoints.length]);

  const removeWaypoint = useCallback((index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleLaunch = useCallback(async (isDraft: boolean) => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please name your expedition.');
      return;
    }
    setSubmitting(true);
    try {
      await expeditionApi.createExpedition({
        title: name.trim(),
        description: description.trim() || undefined,
        category: selectedCat >= 0 ? CATEGORIES[selectedCat].toLowerCase() : undefined,
        region: selectedRegion >= 0 ? CONTINENTS[selectedRegion] : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        visibility: VISIBILITY_OPTIONS[visibility].label.toLowerCase(),
        funding_goal: fundingEnabled && fundingGoal && !isNaN(parseFloat(fundingGoal.replace(/,/g, ''))) ? Math.round(parseFloat(fundingGoal.replace(/,/g, '')) * 100) : undefined,
        status: isDraft ? 'planned' : 'active',
      });
      Alert.alert(
        isDraft ? 'Draft saved' : 'Expedition launched!',
        undefined,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create expedition');
    } finally {
      setSubmitting(false);
    }
  }, [name, description, selectedCat, selectedRegion, startDate, endDate, visibility, fundingEnabled, fundingGoal, router]);

  if (!ready) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <NavBar onBack={() => router.back()} title="NEW EXPEDITION" />
        <ActivityIndicator color={brandColors.copper} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar
        onBack={() => (step > 0 ? setStep(step - 1) : router.back())}
        title="NEW EXPEDITION"
        right={
          <Text style={styles.stepCounter}>{step + 1}/{STEPS.length}</Text>
        }
      />

      {/* Step indicator */}
      <View style={[styles.stepBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {STEPS.map((s, i) => (
          <TouchableOpacity
            key={s}
            style={[styles.stepItem, i === step && styles.stepItemActive]}
            onPress={() => setStep(i)}
          >
            <Text
              style={[
                styles.stepLabel,
                {
                  color: i === step
                    ? brandColors.copper
                    : i < step
                      ? colors.text
                      : colors.textTertiary,
                },
              ]}
            >
              {s}
            </Text>
            {i < step && (
              <View style={styles.checkmark}>
                <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={brandColors.green} strokeWidth={3}>
                  <Path d="M20 6L9 17l-5-5" />
                </Svg>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>

          {/* STEP 1: DETAILS */}
          {step === 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>EXPEDITION DETAILS</Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              </View>

              <HCard>
                <View style={styles.stepBody}>
                  <HTextField label="EXPEDITION NAME" placeholder="e.g. Trans-Siberian Journey" value={name} onChangeText={setName} />

                  {/* Cover image placeholder */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>COVER IMAGE</Text>
                    <TouchableOpacity style={[styles.dashedBox, { borderColor: colors.textTertiary }]}>
                      <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={1.5}>
                        <Path d="M3 3h18v18H3zM8.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21" />
                      </Svg>
                      <Text style={[styles.dashedText, { color: colors.textTertiary }]}>Tap to add cover photo</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Description */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
                    <TextInput
                      style={[styles.textarea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                      multiline
                      placeholder="Describe your expedition..."
                      placeholderTextColor={colors.textTertiary}
                      value={description}
                      onChangeText={setDescription}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Category chips */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
                    <View style={styles.chipGrid}>
                      {CATEGORIES.map((cat, i) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selectedCat === i ? brandColors.copper : colors.inputBackground,
                              borderColor: selectedCat === i ? brandColors.copper : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedCat(i)}
                        >
                          <Text style={[styles.chipText, { color: selectedCat === i ? '#fff' : colors.textTertiary }]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Region chips */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>REGION</Text>
                    <View style={styles.chipGrid}>
                      {CONTINENTS.map((c, i) => (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: selectedRegion === i ? brandColors.blue : colors.inputBackground,
                              borderColor: selectedRegion === i ? brandColors.blue : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedRegion(i)}
                        >
                          <Text style={[styles.chipText, { color: selectedRegion === i ? '#fff' : colors.textTertiary }]}>
                            {c}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Dates */}
                  <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                      <HTextField label="START DATE" placeholder="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
                    </View>
                    <View style={styles.dateField}>
                      <HTextField label="END DATE" placeholder="YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
                    </View>
                  </View>

                  {/* Visibility */}
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
                </View>
              </HCard>

              <HButton variant="copper" onPress={() => setStep(1)}>
                NEXT: PLAN ROUTE →
              </HButton>
            </>
          )}

          {/* STEP 2: ROUTE */}
          {step === 1 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>ROUTE PLANNING</Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              </View>

              <HCard>
                <View style={styles.stepBody}>
                  {/* Interactive route map */}
                  <View style={[styles.mapArea, { borderColor: colors.border }]}>
                    <HeimuMap
                      style={{ height: 240 }}
                      center={[0, 20]}
                      zoom={2}
                      interactive={true}
                      waypoints={waypoints
                        .filter((wp) => wp.coords)
                        .map((wp): WaypointMarker => {
                          const [lng, lat] = wp.coords!.split(',').map(Number);
                          return { coordinates: [lng, lat], type: wp.type, label: wp.name };
                        })}
                      onMapPress={(coords) => {
                        const type: WaypointEntry['type'] = waypoints.length === 0 ? 'origin' : 'waypoint';
                        setWaypoints((prev) => [
                          ...prev,
                          { name: `Point ${prev.length + 1}`, type, coords: `${coords[0]},${coords[1]}` },
                        ]);
                      }}
                    />
                  </View>

                  {/* Map legend */}
                  <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: brandColors.blue, width: 8, height: 8 }]} />
                      <Text style={[styles.legendText, { color: colors.textTertiary }]}>ORIGIN</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: brandColors.copper, width: 6, height: 6 }]} />
                      <Text style={[styles.legendText, { color: colors.textTertiary }]}>WAYPOINT</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: brandColors.green, width: 8, height: 8 }]} />
                      <Text style={[styles.legendText, { color: colors.textTertiary }]}>DESTINATION</Text>
                    </View>
                  </View>

                  {/* Search + Add */}
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>SEARCH LOCATION</Text>
                    <View style={styles.searchRow}>
                      <View style={styles.searchInput}>
                        <SearchBar placeholder="Search city or POI..." value={waypointSearch} onChangeText={setWaypointSearch} />
                      </View>
                      <TouchableOpacity style={styles.addBtn} onPress={addWaypoint}>
                        <Text style={styles.addBtnText}>ADD</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Waypoint list */}
                  {waypoints.length > 0 && (
                    <View style={styles.fieldGroup}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>
                        WAYPOINTS ({waypoints.length})
                      </Text>
                      <View style={[styles.wpListBorder, { borderWidth: 1, borderColor: colors.borderThin }]}>
                        {waypoints.map((wp, i) => {
                          const wpColor = wp.type === 'origin' ? brandColors.blue : wp.type === 'destination' ? brandColors.green : brandColors.copper;
                          return (
                            <View
                              key={i}
                              style={[
                                styles.wpRow,
                                i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                              ]}
                            >
                              <View style={[styles.wpDot, { backgroundColor: wpColor }]} />
                              <View style={styles.wpInfo}>
                                <Text style={[styles.wpName, { color: colors.text }]}>{wp.name}</Text>
                                <Text style={[styles.wpType, { color: wpColor }]}>{wp.type.toUpperCase()}</Text>
                              </View>
                              <TouchableOpacity onPress={() => removeWaypoint(i)}>
                                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                                  <Path d="M18 6L6 18M6 6l12 12" />
                                </Svg>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              </HCard>

              <View style={styles.navButtons}>
                <View style={styles.navBtnSmall}>
                  <HButton variant="blue" outline onPress={() => setStep(0)}>← BACK</HButton>
                </View>
                <View style={styles.navBtnLarge}>
                  <HButton variant="copper" onPress={() => setStep(2)}>NEXT: FUNDING →</HButton>
                </View>
              </View>
            </>
          )}

          {/* STEP 3: FUNDING */}
          {step === 2 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>FUNDING GOAL</Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              </View>

              <HCard>
                <View style={styles.infoCard}>
                  <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                    Set a funding goal for this expedition. Sponsors will use your account-level sponsorship tiers.
                  </Text>
                </View>
              </HCard>

              <HCard>
                <View style={styles.stepBody}>
                  {/* Toggle */}
                  <TouchableOpacity
                    style={[styles.toggleRow, { borderBottomColor: colors.borderThin }]}
                    onPress={() => setFundingEnabled(!fundingEnabled)}
                  >
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>Enable sponsorship</Text>
                    <View style={[styles.toggle, fundingEnabled && styles.toggleActive]}>
                      <View style={[styles.toggleKnob, fundingEnabled && styles.toggleKnobActive]} />
                    </View>
                  </TouchableOpacity>

                  {fundingEnabled && (
                    <HTextField
                      label="FUNDING GOAL ($)"
                      placeholder="0.00"
                      value={fundingGoal}
                      onChangeText={setFundingGoal}
                    />
                  )}
                </View>
              </HCard>

              <View style={styles.navButtons}>
                <View style={styles.navBtnSmall}>
                  <HButton variant="blue" outline onPress={() => setStep(1)}>← BACK</HButton>
                </View>
                <View style={styles.navBtnLarge}>
                  <HButton variant="copper" onPress={() => setStep(3)}>NEXT: REVIEW →</HButton>
                </View>
              </View>
            </>
          )}

          {/* STEP 4: REVIEW */}
          {step === 3 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>REVIEW EXPEDITION</Text>
                <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Preview card */}
              <HCard>
                <ImagePlaceholder height={120} />
                <View style={styles.previewContent}>
                  <Text style={[styles.previewTitle, { color: colors.text }]}>
                    {name || 'Untitled Expedition'}
                  </Text>
                  <Text style={[styles.previewMeta, { color: colors.textTertiary }]}>
                    {selectedCat >= 0 ? CATEGORIES[selectedCat] : '—'}
                    {selectedRegion >= 0 ? ` · ${CONTINENTS[selectedRegion]}` : ''}
                  </Text>
                  {description ? (
                    <Text style={[styles.previewDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {description}
                    </Text>
                  ) : null}
                  <View style={[styles.previewDivider, { borderTopColor: colors.borderThin }]}>
                    <Text style={[styles.previewInfo, { color: colors.textTertiary }]}>
                      {startDate || '—'} → {endDate || '—'} · {waypoints.length} waypoints
                    </Text>
                  </View>
                  {fundingEnabled && fundingGoal && (
                    <View style={[styles.previewDivider, { borderTopColor: colors.borderThin }]}>
                      <Text style={styles.fundingLabel}>FUNDING GOAL</Text>
                      <Text style={[styles.fundingAmount, { color: colors.text }]}>${fundingGoal}</Text>
                    </View>
                  )}
                </View>
              </HCard>

              {/* Launch Checklist */}
              <HCard>
                <View style={[styles.checklistHeader, { borderBottomWidth: 1, borderBottomColor: colors.borderThin }]}>
                  <Text style={[styles.checklistTitle, { color: colors.text }]}>LAUNCH CHECKLIST</Text>
                </View>
                {[
                  { label: 'Expedition name', done: !!name.trim() },
                  { label: 'Cover image', done: false },
                  { label: 'Description', done: !!description.trim() },
                  { label: 'Route with waypoints', done: waypoints.length > 0 },
                  { label: 'Funding goal', done: fundingEnabled && !!fundingGoal },
                  { label: 'Dates set', done: !!startDate && !!endDate },
                ].map((item, i) => (
                  <View
                    key={item.label}
                    style={[
                      styles.checklistItem,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderThin },
                    ]}
                  >
                    <View style={[
                      styles.checklistBox,
                      {
                        borderColor: item.done ? brandColors.green : colors.textTertiary,
                        backgroundColor: item.done ? brandColors.green : 'transparent',
                      }
                    ]}>
                      {item.done && (
                        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                          <Path d="M20 6L9 17l-5-5" />
                        </Svg>
                      )}
                    </View>
                    <Text style={[styles.checklistLabel, { color: item.done ? colors.text : colors.textTertiary }]}>
                      {item.label}
                    </Text>
                    {!item.done && (
                      <Text style={styles.checklistAdd}>ADD</Text>
                    )}
                  </View>
                ))}
              </HCard>

              <View style={styles.launchActions}>
                <HButton variant="copper" onPress={() => handleLaunch(false)} disabled={submitting}>
                  {submitting ? 'LAUNCHING...' : 'LAUNCH EXPEDITION'}
                </HButton>
                <View style={styles.gap} />
                <HButton variant="copper" outline onPress={() => handleLaunch(true)} disabled={submitting}>
                  SAVE AS DRAFT
                </HButton>
              </View>
            </>
          )}
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
  stepCounter: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.copper,
  },
  stepBar: {
    flexDirection: 'row',
    borderBottomWidth: borders.thick,
  },
  stepItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    position: 'relative',
  },
  stepItemActive: {
    borderBottomColor: brandColors.copper,
  },
  stepLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.54,
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 6,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.66,
    marginBottom: 6,
  },
  sectionLine: {
    height: 2,
  },
  stepBody: { padding: 14 },
  wpListBorder: { overflow: 'hidden' },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  textarea: {
    borderWidth: borders.thick,
    padding: 12,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 90,
  },
  dashedBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  dashedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: borders.thick,
  },
  chipText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateField: {
    flex: 1,
  },
  mapArea: {
    borderWidth: borders.thick,
    overflow: 'hidden',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 0,
  },
  searchInput: {
    flex: 1,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: brandColors.copper,
    borderWidth: borders.thick,
    borderColor: brandColors.copper,
    justifyContent: 'center',
  },
  addBtnText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  wpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  wpDot: {
    width: 8,
    height: 8,
    flexShrink: 0,
  },
  wpInfo: {
    flex: 1,
  },
  wpName: {
    fontSize: 13,
    fontWeight: '600',
  },
  wpType: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.36,
    marginTop: 2,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtnSmall: { flex: 1 },
  navBtnLarge: { flex: 2 },
  infoCard: {
    padding: 14,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 17,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#616161',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: brandColors.copper,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  previewContent: {
    padding: 14,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
  },
  previewMeta: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  previewDesc: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  previewDivider: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  previewInfo: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
  },
  fundingLabel: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: brandColors.copper,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  fundingAmount: {
    fontFamily: mono,
    fontSize: 18,
    fontWeight: '700',
  },
  launchActions: {
    marginTop: 24,
  },
  gap: { height: 8 },
  spacer: { height: 32 },
  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: {},
  legendText: { fontFamily: mono, fontSize: 11, fontWeight: '600' },
  checklistHeader: { padding: 10, paddingHorizontal: 14 },
  checklistTitle: { fontFamily: mono, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 14 },
  checklistBox: { width: 16, height: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checklistLabel: { fontSize: 12, flex: 1 },
  checklistAdd: { fontFamily: mono, fontSize: 12, fontWeight: '700', color: brandColors.copper },
});
