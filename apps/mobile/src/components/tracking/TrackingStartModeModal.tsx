import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { TrackingMode } from '@/context/TrackingContext';
import { useTheme } from '@/theme/ThemeContext';
import { borders, colors as brandColors, mono } from '@/theme/tokens';

interface TrackingStartModeModalProps {
  visible: boolean;
  onCancel(): void;
  onPick(mode: TrackingMode): void;
}

/**
 * Center-modal that asks the user how long this expedition will be. The
 * answer picks the cadence the underlying tracking task uses:
 *
 * - Active: 60s / 50m. Day trips and intentional active sessions. Higher
 *   battery cost, denser polyline.
 * - Conservative: 5min / 500m with deferred batching. Multi-day. Sparser
 *   polyline, much longer battery life.
 *
 * Per the Phase 1 spec decision #2, the answer is prompted explicitly at
 * tracking-start rather than chosen by a silent default. The user can
 * change tracking by stopping and starting a new session.
 *
 * Visual identity follows the rest of the mobile app: copper header bar,
 * sharp corners (zero radius), 2px borders, mono uppercase labels, and
 * fully theme-aware surfaces so the modal reads correctly in both light
 * and dark modes.
 */
export function TrackingStartModeModal({
  visible,
  onCancel,
  onPick,
}: TrackingStartModeModalProps) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Copper header bar — matches the brand-color header used by
              the page-sheet modals (e.g., UPDATE LOCATION on the
              expedition detail screen). */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>START LIVE TRACKING</Text>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              style={({ pressed }) => [
                styles.closeBtn,
                pressed && styles.closeBtnPressed,
              ]}
            >
              <Text style={styles.closeText}>CLOSE</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={[styles.heading, { color: colors.text }]}>
              How long is this trip?
            </Text>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>
              Tracking adjusts cadence to match your trip length. You can
              stop and restart any time.
            </Text>

            <ModeCard
              label="DAY TRIP"
              sublabel="Active · 60-second cadence · denser polyline"
              tag="Best battery for shorter trips"
              onPress={() => onPick('active')}
              colors={colors}
            />
            <ModeCard
              label="MULTI-DAY"
              sublabel="Conservative · 5-min cadence · deferred batching"
              tag="Best battery for long expeditions"
              onPress={() => onPick('conservative')}
              colors={colors}
              recommended
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface ModeCardProps {
  label: string;
  sublabel: string;
  tag: string;
  onPress(): void;
  recommended?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}

function ModeCard({
  label,
  sublabel,
  tag,
  onPress,
  recommended,
  colors,
}: ModeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${sublabel}`}
      style={({ pressed }) => [
        styles.modeCard,
        {
          backgroundColor: colors.inputBackground,
          borderColor: pressed ? brandColors.copper : colors.border,
        },
      ]}
    >
      <View style={styles.modeRow}>
        <View style={styles.modeText}>
          <Text style={[styles.modeLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.modeSublabel, { color: colors.textTertiary }]}>
            {sublabel}
          </Text>
        </View>
        {recommended && <Text style={styles.recommended}>SUGGESTED</Text>}
      </View>
      <Text style={styles.modeTag}>{tag}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    overflow: 'hidden',
  },
  // ─── Header ───
  header: {
    backgroundColor: brandColors.copper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#ffffff',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  closeText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#ffffff',
  },
  // ─── Body ───
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  heading: {
    fontFamily: mono,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subheading: {
    fontFamily: mono,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 16,
  },
  // ─── Mode card ───
  modeCard: {
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    padding: 14,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modeText: {
    flex: 1,
    minWidth: 0,
  },
  modeLabel: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modeSublabel: {
    fontFamily: mono,
    fontSize: 10,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  modeTag: {
    fontFamily: mono,
    fontSize: 10,
    color: brandColors.copper,
    marginTop: 8,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  recommended: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '800',
    color: brandColors.copper,
    letterSpacing: 1.2,
  },
});
