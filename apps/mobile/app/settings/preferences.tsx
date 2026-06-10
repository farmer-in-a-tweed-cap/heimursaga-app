import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  usePreferences,
  type DistanceUnit,
  type MapLayer,
} from '@/context/PreferencesContext';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { RadioOption } from '@/components/ui/RadioOption';
import { mono } from '@/theme/tokens';

const THEME_OPTIONS = ['Light', 'Dark'];

const UNIT_OPTIONS: { value: DistanceUnit; label: string; desc: string }[] = [
  { value: 'km', label: 'METRIC (KM)', desc: 'Kilometers, km/h' },
  { value: 'mi', label: 'IMPERIAL (MI)', desc: 'Miles, mph' },
  { value: 'nm', label: 'NAUTICAL (NM)', desc: 'Nautical miles, knots' },
];

const MAP_LAYER_OPTIONS: { value: MapLayer; label: string; desc: string }[] = [
  { value: 'heimursaga', label: 'HEIMURSAGA', desc: 'Topographic expedition style' },
  { value: 'satellite', label: 'SATELLITE', desc: 'Satellite imagery with labels' },
];

export default function PreferencesScreen() {
  const { colors, mode, toggleMode } = useTheme();
  const { distanceUnit, setDistanceUnit, mapLayer, setMapLayer } = usePreferences();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const themeIndex = mode === 'light' ? 0 : 1;

  if (!ready) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <NavBar onBack={() => router.back()} title="PREFERENCES" />

      <ScrollView>
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>THEME</Text>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          </View>
          <HCard>
            <View style={styles.cardInner}>
              {THEME_OPTIONS.map((opt, i) => (
                <RadioOption
                  key={opt}
                  label={opt.toUpperCase()}
                  description={`Always use ${opt.toLowerCase()} mode`}
                  selected={themeIndex === i}
                  onSelect={() => {
                    if (i !== themeIndex) toggleMode();
                  }}
                />
              ))}
            </View>
          </HCard>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>DISTANCE UNITS</Text>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          </View>
          <HCard>
            <View style={styles.cardInner}>
              {UNIT_OPTIONS.map((opt) => (
                <RadioOption
                  key={opt.value}
                  label={opt.label}
                  description={opt.desc}
                  selected={distanceUnit === opt.value}
                  onSelect={() => setDistanceUnit(opt.value)}
                />
              ))}
            </View>
          </HCard>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>MAP STYLE</Text>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          </View>
          <HCard>
            <View style={styles.cardInner}>
              {MAP_LAYER_OPTIONS.map((opt) => (
                <RadioOption
                  key={opt.value}
                  label={opt.label}
                  description={opt.desc}
                  selected={mapLayer === opt.value}
                  onSelect={() => setMapLayer(opt.value)}
                />
              ))}
            </View>
          </HCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionHeader: { marginBottom: 6 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: mono,
  },
  sectionLine: {
    height: 2,
    marginTop: 4,
    marginBottom: 8,
  },
  cardInner: { padding: 8 },
});
