import React, { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { mono, colors } from '@/theme/tokens';
import { useTracking } from '@/context/TrackingContext';

/**
 * Persistent banner shown across all screens whenever a tracking session is
 * active or paused. Tap to navigate back to the expedition. Pause/resume
 * and Stop are exposed directly. Drop Waypoint is the quick-drop button
 * (Phase 1b step 4.5 wiring; here the button is rendered conditionally on
 * latestPosition so it only enables once GPS has produced a fix).
 */
export function TrackingBanner() {
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
    dropWaypointAtCurrentPosition,
  } = useTracking();

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

  const onStop = useCallback(() => {
    Alert.alert(
      'Stop tracking?',
      'The last position remains as your current location pin. You can re-pin manually anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => void stopTracking() },
      ],
    );
  }, [stopTracking]);

  // No `latestPosition` in the dep array — the button's `disabled`
  // prop already gates on it, and the context's drop method guards
  // defensively. Without this, every GPS fix in step 3 would recreate
  // the callback and force the BannerButton to re-render.
  const onDrop = useCallback(() => {
    void (async () => {
      const ok = await dropWaypointAtCurrentPosition();
      if (ok) {
        Alert.alert('Waypoint dropped', 'Saved at your current location. Edit later from the expedition.');
      } else {
        Alert.alert('Could not drop waypoint', 'Try again in a moment.');
      }
    })();
  }, [dropWaypointAtCurrentPosition]);

  // Also hide the banner while transitioning out. Without this, a slow
  // server stop could leave the banner visible (with still-tappable
  // controls) during the network round-trip.
  if (status === 'idle' || status === 'starting' || status === 'stopping') {
    return null;
  }

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
  button: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
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
