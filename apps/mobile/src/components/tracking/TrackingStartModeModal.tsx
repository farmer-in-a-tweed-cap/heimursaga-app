import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { TrackingMode } from '@/context/TrackingContext';
import { mono, serif, colors } from '@/theme/tokens';

interface TrackingStartModeModalProps {
  visible: boolean;
  onCancel(): void;
  onPick(mode: TrackingMode): void;
}

/**
 * Center-modal that asks the user how long this expedition will be. The
 * answer picks the cadence the underlying tracking task uses (step 3
 * wiring):
 *
 * - Active: 60s / 50m. Day trips and intentional active sessions. Higher
 *   battery cost, denser polyline.
 * - Conservative: 5min / 500m with deferred batching. Multi-day. Sparser
 *   polyline, much longer battery life.
 *
 * Per the Phase 1 spec decision #2, the answer is prompted explicitly at
 * tracking-start rather than chosen by a silent default. The user can
 * always change tracking later by stopping and starting again.
 */
export function TrackingStartModeModal({
  visible,
  onCancel,
  onPick,
}: TrackingStartModeModalProps) {
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
          style={styles.card}
          accessibilityRole="none"
        >
          <Text style={styles.eyebrow}>START LIVE TRACKING</Text>
          <Text style={styles.heading}>How long is this trip?</Text>
          <Text style={styles.subheading}>
            Tracking adjusts cadence to match your trip length. You can stop and restart any time.
          </Text>

          <ModeCard
            label="Day trip"
            sublabel="Active mode · 60-second cadence · denser polyline"
            tag="Best battery for shorter trips"
            onPress={() => onPick('active')}
          />
          <ModeCard
            label="Multi-day"
            sublabel="Conservative · 5-min cadence · deferred batching"
            tag="Best battery for long expeditions"
            onPress={() => onPick('conservative')}
            recommended
          />

          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
          >
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ModeCard({
  label,
  sublabel,
  tag,
  onPress,
  recommended,
}: {
  label: string;
  sublabel: string;
  tag: string;
  onPress(): void;
  recommended?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} — ${sublabel}`}
      style={({ pressed }) => [styles.modeCard, pressed && styles.modeCardPressed]}
    >
      <View style={styles.modeRow}>
        <View style={styles.modeText}>
          <Text style={styles.modeLabel}>{label}</Text>
          <Text style={styles.modeSublabel}>{sublabel}</Text>
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
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
  },
  eyebrow: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.copper,
    marginBottom: 8,
  },
  heading: {
    fontFamily: serif,
    fontSize: 22,
    lineHeight: 28,
    color: colors.black,
    marginBottom: 8,
  },
  subheading: {
    fontFamily: serif,
    fontSize: 14,
    lineHeight: 20,
    color: colors.darkGray,
    marginBottom: 18,
  },
  modeCard: {
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  modeCardPressed: {
    borderColor: colors.copper,
    backgroundColor: 'rgba(172,109,70,0.06)',
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
    fontFamily: serif,
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
  },
  modeSublabel: {
    fontFamily: mono,
    fontSize: 11,
    color: colors.darkGray,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  modeTag: {
    fontFamily: mono,
    fontSize: 10,
    color: colors.copper,
    marginTop: 8,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
  },
  recommended: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '800',
    color: colors.copper,
    letterSpacing: 1.2,
  },
  cancel: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelPressed: {
    opacity: 0.6,
  },
  cancelLabel: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.0,
    color: colors.darkGray,
    textTransform: 'uppercase',
  },
});
