import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTracking } from '@/context/TrackingContext';
import { useTheme } from '@/theme/ThemeContext';
import { borders, colors as brandColors, mono } from '@/theme/tokens';

interface TrackingPermissionExplainerProps {
  visible: boolean;
  onClose(): void;
  /** Called after the OS permission prompt resolves with the OS truth. */
  onResolved(result: 'always' | 'when-in-use' | 'denied'): void;
  /**
   * When true, "Maybe later" surfaces an explicit warning that
   * background tracking is required for the chosen cadence — otherwise
   * the user might lock their phone expecting Conservative mode to keep
   * recording, and lose the entire trip's data.
   */
  warnOnDismissAlwaysRequired?: boolean;
}

/**
 * In-app explainer shown BEFORE triggering iOS's Always-permission prompt.
 * Apple's reviewers explicitly look for this priming step — it
 * significantly improves the user-side accept rate and addresses the
 * "consent informed by context" guideline.
 *
 * Visual identity matches the rest of the app: copper header bar, sharp
 * corners, 2px borders, mono uppercase labels for structural elements,
 * theme-aware surfaces (works in light + dark).
 */
export function TrackingPermissionExplainer({
  visible,
  onClose,
  onResolved,
  warnOnDismissAlwaysRequired,
}: TrackingPermissionExplainerProps) {
  const { colors } = useTheme();
  const { requestAlwaysPermission, refreshPermissionLevel } = useTracking();
  const [busy, setBusy] = useState(false);

  const onEnable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const level = await requestAlwaysPermission();
      onResolved(
        level === 'always'
          ? 'always'
          : level === 'when-in-use'
            ? 'when-in-use'
            : 'denied',
      );
    } finally {
      setBusy(false);
    }
  }, [busy, requestAlwaysPermission, onResolved]);

  const dismissWithLevel = useCallback(async () => {
    // Don't lie to the caller — re-read the OS state so the resolved
    // level reflects truth (e.g., user may have denied foreground earlier).
    const level = await refreshPermissionLevel();
    onResolved(
      level === 'always'
        ? 'always'
        : level === 'when-in-use'
          ? 'when-in-use'
          : 'denied',
    );
    onClose();
  }, [refreshPermissionLevel, onResolved, onClose]);

  const onMaybeLater = useCallback(() => {
    if (warnOnDismissAlwaysRequired) {
      Alert.alert(
        'Background tracking off',
        'Your route will only record while the app is open. Lock your phone or switch apps and tracking pauses until you return. You can enable always-on tracking later in iOS Settings.',
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'OK, continue', onPress: () => void dismissWithLevel() },
        ],
      );
      return;
    }
    void dismissWithLevel();
  }, [warnOnDismissAlwaysRequired, dismissWithLevel]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Copper header bar — same pattern as UPDATE LOCATION and the
            start-mode modal so the two-step start flow reads as one
            visual unit. */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>BACKGROUND TRACKING</Text>
            <Text style={styles.headerSubtitle}>Step 2 of 2 · Permission</Text>
          </View>
          <Pressable
            onPress={onClose}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.closeBtnPressed,
            ]}
          >
            <Text style={styles.closeText}>CLOSE</Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <Text style={[styles.heading, { color: colors.text }]}>
            Keep recording when your phone locks
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            To record your route during a multi-day expedition, Heimursaga
            needs your location even when the app is closed or your phone is
            locked.
          </Text>

          <InfoBox
            label="TRACKING RUNS WHEN"
            accentColor={brandColors.green}
            colors={colors}
            items={[
              "You've started a live track on an active expedition",
              "You haven't paused it from the tracking banner",
            ]}
          />
          <InfoBox
            label="TRACKING STOPS WHEN"
            accentColor={brandColors.red}
            colors={colors}
            items={[
              'You tap Pause or Stop on the tracking banner',
              'The expedition ends or is cancelled',
            ]}
          />

          <Text style={[styles.footnote, { color: colors.textTertiary }]}>
            Revoke anytime in iOS Settings → Privacy → Location Services →
            Heimursaga.
          </Text>
        </ScrollView>

        <View
          style={[
            styles.actions,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={onEnable}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Enable always-on tracking"
            style={({ pressed }) => [
              styles.buttonPrimary,
              pressed && styles.buttonPressed,
              busy && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonLabelPrimary}>
              {busy ? 'REQUESTING…' : 'ENABLE ALWAYS-ON TRACKING'}
            </Text>
          </Pressable>
          <Pressable
            onPress={onMaybeLater}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
            style={({ pressed }) => [
              styles.buttonSecondary,
              { borderColor: colors.border },
              pressed && styles.buttonPressed,
              busy && styles.buttonDisabled,
            ]}
          >
            <Text style={[styles.buttonLabelSecondary, { color: colors.text }]}>
              MAYBE LATER
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

interface InfoBoxProps {
  label: string;
  accentColor: string;
  items: string[];
  colors: ReturnType<typeof useTheme>['colors'];
}

function InfoBox({ label, accentColor, items, colors }: InfoBoxProps) {
  return (
    <View
      style={[
        styles.infoBox,
        {
          backgroundColor: colors.inputBackground,
          borderColor: colors.border,
          borderLeftColor: accentColor,
        },
      ]}
    >
      <Text style={[styles.infoLabel, { color: accentColor }]}>{label}</Text>
      {items.map((item) => (
        <View key={item} style={styles.infoRow}>
          <Text style={[styles.infoBullet, { color: accentColor }]}>•</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#ffffff',
  },
  headerSubtitle: {
    fontFamily: mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    letterSpacing: 0.3,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  heading: {
    fontFamily: mono,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  body: {
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  // ─── Info boxes ───
  infoBox: {
    borderWidth: borders.thin,
    borderLeftWidth: 4,
    borderRadius: borders.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  infoLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  infoBullet: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    width: 10,
  },
  infoText: {
    flex: 1,
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 18,
  },
  footnote: {
    fontFamily: mono,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 14,
    letterSpacing: 0.2,
  },
  // ─── Actions ───
  actions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderTopWidth: borders.thin,
  },
  buttonPrimary: {
    backgroundColor: brandColors.copper,
    borderWidth: borders.thick,
    borderColor: brandColors.copper,
    borderRadius: borders.radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabelPrimary: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#ffffff',
  },
  buttonLabelSecondary: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
