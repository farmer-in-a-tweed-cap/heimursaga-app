import React, { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTracking } from '@/context/TrackingContext';
import { mono, serif, colors } from '@/theme/tokens';

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
 */
export function TrackingPermissionExplainer({
  visible,
  onClose,
  onResolved,
  warnOnDismissAlwaysRequired,
}: TrackingPermissionExplainerProps) {
  const { requestAlwaysPermission, refreshPermissionLevel } = useTracking();
  const [busy, setBusy] = useState(false);

  const onEnable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const level = await requestAlwaysPermission();
      onResolved(level === 'always' ? 'always' : level === 'when-in-use' ? 'when-in-use' : 'denied');
    } finally {
      setBusy(false);
    }
  }, [busy, requestAlwaysPermission, onResolved]);

  const dismissWithLevel = useCallback(async () => {
    // Don't lie to the caller — re-read the OS state so the resolved
    // level reflects truth (e.g., user may have denied foreground earlier).
    const level = await refreshPermissionLevel();
    onResolved(level === 'always' ? 'always' : level === 'when-in-use' ? 'when-in-use' : 'denied');
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
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          <Text style={styles.eyebrow}>LIVE TRACKING</Text>
          <Text style={styles.heading}>Keep tracking when your phone locks</Text>

          <Text style={styles.body}>
            To record your route during a multi-day expedition, Heimursaga
            needs your location even when the app is closed or your phone is
            locked.
          </Text>

          <Section title="Tracking runs when:">
            <Bullet>You&apos;ve started a live track on an active expedition</Bullet>
            <Bullet>You haven&apos;t paused it from the tracking banner</Bullet>
          </Section>

          <Section title="Tracking stops when:">
            <Bullet>You tap Pause or Stop on the tracking banner</Bullet>
            <Bullet>The expedition ends or is cancelled</Bullet>
          </Section>

          <Text style={styles.footnote}>
            You can revoke this permission anytime in iOS Settings → Privacy →
            Location Services → Heimursaga.
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            onPress={onMaybeLater}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Maybe later"
            style={({ pressed }) => [styles.button, styles.buttonSecondary, pressed && styles.buttonPressed, busy && styles.buttonDisabled]}
          >
            <Text style={styles.buttonLabelSecondary}>Maybe later</Text>
          </Pressable>
          <Pressable
            onPress={onEnable}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel="Enable always-on tracking"
            style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed && styles.buttonPressed, busy && styles.buttonDisabled]}
          >
            <Text style={styles.buttonLabelPrimary}>
              {busy ? 'Requesting…' : 'Enable always-on tracking'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletMark}>✓</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  eyebrow: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: colors.copper,
    marginBottom: 12,
  },
  heading: {
    fontFamily: serif,
    fontSize: 26,
    lineHeight: 32,
    color: colors.black,
    marginBottom: 16,
  },
  body: {
    fontFamily: serif,
    fontSize: 16,
    lineHeight: 24,
    color: colors.black,
    marginBottom: 20,
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.darkGray,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  bulletMark: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '700',
    color: colors.copper,
    width: 16,
  },
  bulletText: {
    flex: 1,
    fontFamily: serif,
    fontSize: 15,
    lineHeight: 22,
    color: colors.black,
  },
  footnote: {
    fontFamily: serif,
    fontSize: 13,
    lineHeight: 20,
    color: colors.darkGray,
    marginTop: 24,
  },
  actions: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.copper,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.darkGray,
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
    letterSpacing: 0.5,
    color: '#ffffff',
  },
  buttonLabelSecondary: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.darkGray,
  },
});
