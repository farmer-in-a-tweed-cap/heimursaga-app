import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borders, mono, colors } from '@/theme/tokens';
import { useAuth } from '@/context/AuthContext';
import { useTracking } from '@/context/TrackingContext';
import { QuickDropModal } from '@/components/tracking/QuickDropModal';

/**
 * Persistent top banner, one of two modes (live tracking wins):
 *
 * 1. TRACKING — a session is active or paused: status, expedition title,
 *    DROP / PAUSE / STOP controls. Tap navigates to the tracked
 *    expedition.
 * 2. QUICK ACCESS — the explorer has a current expedition
 *    (user.activeExpedition: active preferred over planned, blueprints
 *    excluded): one-tap route to that expedition's page. Mirrors the web
 *    header's ActiveExpeditionBanner, same status colors.
 *
 * Rendered once above the navigation stack (app/_layout.tsx) so it
 * persists across screens. useTopInset() must mirror this component's
 * visibility logic — screens drop their own top inset while a banner is
 * consuming the safe area.
 */
export function useExpeditionBannerVisible(): boolean {
  const { status } = useTracking();
  const { user } = useAuth();
  return status === 'active' || status === 'paused' || !!user?.activeExpedition;
}

export function ExpeditionBanner() {
  const tracking = useTracking();
  const { user } = useAuth();
  const trackingVisible =
    tracking.status === 'active' || tracking.status === 'paused';

  if (trackingVisible) return <TrackingMode />;
  if (user?.activeExpedition) {
    return <QuickAccessMode expedition={user.activeExpedition} />;
  }
  return null;
}

// ─── Mode 2: quick access ───

function QuickAccessMode({
  expedition,
}: {
  expedition: NonNullable<
    NonNullable<ReturnType<typeof useAuth>['user']>['activeExpedition']
  >;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPlanned = expedition.status === 'planned';

  return (
    <Pressable
      onPress={() => router.push(`/expedition/${expedition.publicId}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open your ${isPlanned ? 'planned' : 'active'} expedition: ${expedition.title}`}
      style={({ pressed }) => [
        styles.banner,
        {
          backgroundColor: isPlanned ? colors.blue : colors.copper,
          paddingTop: insets.top + 8,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.statusLabel}>
            {isPlanned ? 'PLANNED EXPEDITION' : 'ACTIVE EXPEDITION'}
          </Text>
          <Text style={styles.expeditionTitle} numberOfLines={1}>
            {expedition.title}
          </Text>
        </View>
      </View>
      <Text style={styles.quickAccessArrow}>{'→'}</Text>
    </Pressable>
  );
}

// ─── Mode 1: live tracking ───

function TrackingMode() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    status,
    expeditionId,
    expeditionTitle,
    latestPosition,
    pauseTracking,
    resumeTracking,
    stopTracking,
  } = useTracking();
  const [dropModalVisible, setDropModalVisible] = useState(false);

  const onTap = useCallback(() => {
    if (!expeditionId) return;
    router.push(`/expedition/${expeditionId}`);
  }, [router, expeditionId]);

  const onPauseResume = useCallback(() => {
    if (status === 'paused') {
      void resumeTracking();
    } else {
      void pauseTracking();
    }
  }, [status, pauseTracking, resumeTracking]);

  // stopTracking throws on server failure (instead of silently releasing
  // local state). Wrap so we can surface the failure as an Alert with a
  // Retry — silent failure was what created the orphan-track +
  // 409-on-next-start dev-loop trap.
  const performStop = useCallback(async () => {
    try {
      await stopTracking();
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : 'Could not stop tracking on the server.';
      Alert.alert(
        'Could not stop tracking',
        `${msg}\n\nYour session is still recording. Retry?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => void performStop() },
        ],
      );
    }
  }, [stopTracking]);

  const onStop = useCallback(() => {
    Alert.alert(
      'Stop tracking?',
      'The last position remains as your current location pin. You can re-pin manually anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => void performStop() },
      ],
    );
  }, [performStop]);

  // DROP opens the quick-drop sheet (optional title + location pick)
  // rather than creating immediately — the sheet owns the create call.
  const onDrop = useCallback(() => {
    setDropModalVisible(true);
  }, []);

  const isPaused = status === 'paused';

  return (
    <Pressable
      onPress={onTap}
      accessibilityRole="button"
      accessibilityLabel={`Open the expedition you are tracking: ${expeditionTitle ?? ''}`}
      style={[
        styles.banner,
        isPaused && styles.bannerPaused,
        // Pad the banner past the status bar / Dynamic Island. The
        // banner sits ABOVE the navigation stack at the screen root
        // and there's no SafeAreaProvider wrapping it, so it would
        // otherwise paint under the notch.
        { paddingTop: insets.top + 8 },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.statusDotWrap}>
          <View style={[styles.statusDot, isPaused ? styles.dotPaused : styles.dotActive]} />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.statusLabel}>
            {isPaused ? 'TRACKING PAUSED' : 'LIVE TRACKING'}
          </Text>
          <Text style={styles.expeditionTitle} numberOfLines={1}>
            {expeditionTitle ?? 'Expedition'}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <BannerButton
          label={latestPosition ? 'DROP' : 'GPS…'}
          disabled={!latestPosition || isPaused}
          onPress={onDrop}
        />
        <BannerButton
          label={isPaused ? 'RESUME' : 'PAUSE'}
          onPress={onPauseResume}
        />
        <BannerButton label="STOP" tone="danger" onPress={onStop} />
      </View>

      <QuickDropModal
        visible={dropModalVisible}
        onClose={() => setDropModalVisible(false)}
        onDropped={() => {
          setDropModalVisible(false);
          Alert.alert('Waypoint dropped', 'Saved to your expedition. Edit it anytime from the waypoint list.');
        }}
        onFailed={() => {
          Alert.alert('Could not drop waypoint', 'Try again in a moment.');
        }}
      />
    </Pressable>
  );
}

interface BannerButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}

function BannerButton({ label, onPress, disabled, tone = 'default' }: BannerButtonProps) {
  return (
    <Pressable
      onPress={(e) => {
        // Don't bubble to the banner's onTap (which navigates).
        e.stopPropagation();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        tone === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.buttonLabel, tone === 'danger' && styles.buttonLabelDanger]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.copper,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerPaused: {
    backgroundColor: colors.darkGray,
  },
  statusDotWrap: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    // Matches the web live signal (LiveTrackBadge dot + map polyline),
    // not the muted brand green — "live" reads the same on both surfaces.
    backgroundColor: '#22c55e',
  },
  dotPaused: {
    backgroundColor: colors.white,
    opacity: 0.6,
  },
  titleColumn: {
    flex: 1,
    minWidth: 0,
  },
  statusLabel: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: '#ffffff',
    opacity: 0.9,
  },
  expeditionTitle: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickAccessArrow: {
    fontFamily: mono,
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: borders.thin,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: borders.radius,
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.30)',
  },
  buttonDanger: {
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.0,
    color: '#ffffff',
  },
  buttonLabelDanger: {
    color: '#ffffff',
  },
});
