import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { NavBar } from '@/components/ui/NavBar';
import { HCard } from '@/components/ui/HCard';
import { RadioOption } from '@/components/ui/RadioOption';
import { mono, colors as brandColors } from '@/theme/tokens';

const THEME_OPTIONS = ['Light', 'Dark', 'System'];
const UNIT_OPTIONS = ['Metric (km)', 'Imperial (mi)', 'Nautical (nm)'];

const DISTANCE_UNIT_KEY = 'heimursaga_distance_unit';

export default function PreferencesScreen() {
  const { colors, mode, toggleMode } = useTheme();
  const router = useRouter();
  const { ready } = useRequireAuth();

  const themeIndex = mode === 'light' ? 0 : 1;
  const [distanceUnit, setDistanceUnit] = useState(0);

  useEffect(() => {
    SecureStore.getItemAsync(DISTANCE_UNIT_KEY).then((val: string | null) => {
      if (val === 'imperial') setDistanceUnit(1);
      else if (val === 'nautical') setDistanceUnit(2);
    });
  }, []);

  const handleThemeChange = (index: number) => {
    if (index !== themeIndex) {
      toggleMode();
    }
  };

  const handleDistanceChange = async (index: number) => {
    setDistanceUnit(index);
    await SecureStore.setItemAsync(DISTANCE_UNIT_KEY, index === 2 ? 'nautical' : index === 1 ? 'imperial' : 'metric');
  };

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
                  description={i === 2 ? 'Follow device settings' : `Always use ${opt.toLowerCase()} mode`}
                  selected={themeIndex === i || (i === 2 && false)}
                  onSelect={() => handleThemeChange(i)}
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
              {UNIT_OPTIONS.map((opt, i) => (
                <RadioOption
                  key={opt}
                  label={opt.toUpperCase()}
                  description={i === 0 ? 'Kilometers, meters' : i === 1 ? 'Miles, feet' : 'Nautical miles, knots'}
                  selected={distanceUnit === i}
                  onSelect={() => handleDistanceChange(i)}
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
