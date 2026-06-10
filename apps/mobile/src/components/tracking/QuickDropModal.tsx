import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useTracking } from '@/context/TrackingContext';
import { useTheme } from '@/theme/ThemeContext';
import { borders, colors as brandColors, mono } from '@/theme/tokens';
import { LocationPickerModal } from '@/components/ui/LocationPickerModal';

interface QuickDropModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after the waypoint was created (modal already closed). */
  onDropped: () => void;
  /** Called when the drop failed (modal stays open for retry). */
  onFailed: () => void;
}

function formatCoords(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}${lat >= 0 ? 'N' : 'S'} / ${Math.abs(lon).toFixed(4)}${lon >= 0 ? 'E' : 'W'}`;
}

/**
 * Quick-drop sheet for the tracking banner's DROP button. One optional
 * title field and a location row that defaults to the live GPS fix —
 * tap CHANGE to re-assign via the standard map/search picker, USE GPS
 * FIX to come back. Same visual identity as the other tracking modals:
 * copper header, sharp corners, 2px borders, mono uppercase labels,
 * theme-aware surfaces.
 */
export function QuickDropModal({
  visible,
  onClose,
  onDropped,
  onFailed,
}: QuickDropModalProps) {
  const { colors } = useTheme();
  const { latestPosition, dropWaypointAtCurrentPosition } = useTracking();

  const [title, setTitle] = useState('');
  const [pickedLocation, setPickedLocation] = useState<{
    place: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [dropping, setDropping] = useState(false);

  // Fresh form per open — a quick-drop is a new waypoint, never a draft.
  useEffect(() => {
    if (visible) {
      setTitle('');
      setPickedLocation(null);
      setDropping(false);
    }
  }, [visible]);

  const onConfirm = useCallback(async () => {
    if (dropping) return;
    setDropping(true);
    try {
      const ok = await dropWaypointAtCurrentPosition(
        title,
        pickedLocation
          ? { lat: pickedLocation.lat, lon: pickedLocation.lon }
          : undefined,
      );
      if (ok) {
        onDropped();
      } else {
        onFailed();
      }
    } finally {
      setDropping(false);
    }
  }, [dropping, dropWaypointAtCurrentPosition, title, pickedLocation, onDropped, onFailed]);

  const gpsAvailable = !!latestPosition;
  const usingGps = !pickedLocation;
  const canDrop = !dropping && (pickedLocation || gpsAvailable);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdropWrap}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            accessibilityRole="none"
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Copper header bar — same pattern as the start-mode and
                permission modals. */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>DROP WAYPOINT</Text>
              <Pressable
                onPress={onClose}
                disabled={dropping}
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

            <View style={styles.body}>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                TITLE <Text style={{ color: colors.textTertiary }}>(OPTIONAL)</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Quick waypoint"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="sentences"
                returnKeyType="done"
                maxLength={80}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />

              <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 14 }]}>
                LOCATION
              </Text>
              <View
                style={[
                  styles.locationRow,
                  {
                    backgroundColor: colors.inputBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.locationTextWrap}>
                  <Text
                    style={[styles.locationPlace, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {usingGps
                      ? gpsAvailable
                        ? 'Current GPS position'
                        : 'Waiting for GPS fix…'
                      : pickedLocation.place || 'Picked on map'}
                  </Text>
                  <Text style={[styles.locationCoords, { color: colors.textTertiary }]}>
                    {usingGps
                      ? gpsAvailable
                        ? formatCoords(latestPosition.lat, latestPosition.lon)
                        : '—'
                      : formatCoords(pickedLocation.lat, pickedLocation.lon)}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    usingGps ? setPickerVisible(true) : setPickedLocation(null)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={
                    usingGps ? 'Change location' : 'Use GPS fix instead'
                  }
                  style={({ pressed }) => [
                    styles.locationActionBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={styles.locationActionText}>
                    {usingGps ? 'CHANGE' : 'USE GPS FIX'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.footerRow}>
                <Pressable
                  onPress={onClose}
                  disabled={dropping}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>CANCEL</Text>
                </Pressable>
                <Pressable
                  onPress={onConfirm}
                  disabled={!canDrop}
                  accessibilityRole="button"
                  accessibilityLabel="Drop waypoint"
                  style={({ pressed }) => [
                    styles.dropBtn,
                    { opacity: !canDrop ? 0.5 : pressed ? 0.85 : 1 },
                  ]}
                >
                  <Text style={styles.dropText}>
                    {dropping ? 'DROPPING…' : 'DROP WAYPOINT'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>

      {/* Standard map/search picker, seeded with the GPS fix so the map
          opens where the user actually is. */}
      <LocationPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(data) => {
          setPickedLocation(data);
          setPickerVisible(false);
        }}
        initialLat={pickedLocation?.lat ?? latestPosition?.lat ?? null}
        initialLon={pickedLocation?.lon ?? latestPosition?.lon ?? null}
        initialPlace={pickedLocation?.place}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    flex: 1,
  },
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
    paddingTop: 14,
    paddingBottom: 14,
  },
  sectionLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: mono,
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  locationTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  locationPlace: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
  },
  locationCoords: {
    fontFamily: mono,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  locationActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  locationActionText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: brandColors.copper,
  },
  // ─── Footer ───
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: borders.thick,
    borderRadius: borders.radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dropBtn: {
    flex: 2,
    backgroundColor: brandColors.copper,
    borderWidth: borders.thick,
    borderColor: brandColors.copper,
    borderRadius: borders.radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dropText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#ffffff',
  },
});
