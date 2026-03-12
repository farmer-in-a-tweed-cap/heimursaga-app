import React, { useState, useCallback, useRef, useEffect, ComponentType } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ActivityIndicator, Platform, KeyboardAvoidingView, Alert, Linking,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { mono, colors as brandColors, borders } from '@/theme/tokens';
import { MAPBOX_TOKEN } from '@/services/mapConfig';
import type { HeimuMapProps, HeimuMapRef, WaypointMarker } from '@/components/map/HeimuMap';

let ExpoLocation: typeof import('expo-location') | null = null;
try { ExpoLocation = require('expo-location'); } catch { /* not available */ }

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (data: { place: string; lat: number; lon: number }) => void;
  initialLat?: number | null;
  initialLon?: number | null;
  initialPlace?: string;
}

interface GeocodingResult {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

export function LocationPickerModal({
  visible, onClose, onSelect, initialLat, initialLon, initialPlace,
}: LocationPickerModalProps) {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<HeimuMapRef>(null);

  const [MapComponent, setMapComponent] = useState<ComponentType<HeimuMapProps & { ref?: React.Ref<HeimuMapRef> }> | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [place, setPlace] = useState(initialPlace ?? '');
  const [coords, setCoords] = useState<[number, number] | null>(
    initialLat != null && initialLon != null ? [initialLon, initialLat] : null,
  );
  const [gettingLocation, setGettingLocation] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load map lazily
  useEffect(() => {
    if (visible && !MapComponent) {
      import('@/components/map/HeimuMap').then((mod) =>
        setMapComponent(() => mod.default),
      );
    }
  }, [visible, MapComponent]);

  // Reset state when modal opens; clear pending timers on close
  useEffect(() => {
    if (visible) {
      setPlace(initialPlace ?? '');
      setCoords(
        initialLat != null && initialLon != null ? [initialLon, initialLat] : null,
      );
      setSearch('');
      setResults([]);
    } else {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    }
  }, [visible, initialLat, initialLon, initialPlace]);

  const reverseGeocode = useCallback(async (lng: number, lat: number) => {
    if (!MAPBOX_TOKEN) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const feature = data.features?.[0];
      if (feature) setPlace(feature.place_name);
    } catch { /* ignore */ }
  }, []);

  const handleMapPress = useCallback((c: [number, number]) => {
    setCoords(c);
    reverseGeocode(c[0], c[1]);
  }, [reverseGeocode]);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      if (!MAPBOX_TOKEN) return;
      setSearching(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&limit=5`,
        );
        if (!res.ok) { setResults([]); return; }
        const data = await res.json();
        setResults(data.features ?? []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 400);
  }, []);

  const handleSelectResult = useCallback((result: GeocodingResult) => {
    setPlace(result.place_name);
    setCoords(result.center);
    setResults([]);
    setSearch('');
    mapRef.current?.flyTo(result.center, 12);
  }, []);

  const handleUseMyLocation = useCallback(async () => {
    if (!ExpoLocation) return;
    setGettingLocation(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location access was denied. You can enable it in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const c: [number, number] = [loc.coords.longitude, loc.coords.latitude];
      setCoords(c);
      reverseGeocode(c[0], c[1]);
      mapRef.current?.flyTo(c, 12);
    } catch { /* ignore */ }
    finally { setGettingLocation(false); }
  }, [reverseGeocode]);

  const handleConfirm = useCallback(() => {
    if (!coords) return;
    onSelect({ place: place || 'Unknown location', lat: coords[1], lon: coords[0] });
    onClose();
  }, [coords, place, onSelect, onClose]);

  const marker: WaypointMarker[] = coords
    ? [{ coordinates: coords, type: 'entry', label: place }]
    : [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>CANCEL</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>SET LOCATION</Text>
          <TouchableOpacity onPress={handleConfirm} disabled={!coords}>
            <Text style={[styles.doneBtn, { opacity: coords ? 1 : 0.4 }]}>DONE</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={[styles.searchRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
              <Circle cx={11} cy={11} r={8} />
              <Path d="M21 21l-4.35-4.35" />
            </Svg>
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search places..."
              placeholderTextColor={colors.textTertiary}
              value={search}
              onChangeText={handleSearch}
              autoCorrect={false}
            />
            {searching && <ActivityIndicator size="small" color={brandColors.copper} />}
          </View>
          <TouchableOpacity style={styles.locBtn} onPress={handleUseMyLocation} disabled={gettingLocation}>
            {gettingLocation
              ? <ActivityIndicator size="small" color={brandColors.copper} />
              : <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2}>
                  <Circle cx={12} cy={12} r={3} />
                  <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                </Svg>
            }
          </TouchableOpacity>
        </View>

        {/* Search results */}
        {results.length > 0 && (
          <View style={[styles.results, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {results.map((r, i) => (
              <TouchableOpacity
                key={`${r.center[0]}-${r.center[1]}-${i}`}
                style={[styles.resultItem, i < results.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderThin }]}
                onPress={() => handleSelectResult(r)}
              >
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
                  <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <Circle cx={12} cy={10} r={3} />
                </Svg>
                <Text style={[styles.resultText, { color: colors.text }]} numberOfLines={1}>{r.place_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Map */}
        <View style={styles.mapWrap}>
          {MapComponent ? (
            <MapComponent
              ref={mapRef}
              style={{ flex: 1 }}
              center={coords ?? [-40, 30]}
              zoom={coords ? 10 : 2}
              waypoints={marker}
              interactive
              onMapPress={handleMapPress}
            />
          ) : (
            <View style={[styles.mapPlaceholder, { backgroundColor: colors.inputBackground }]}>
              <ActivityIndicator color={brandColors.copper} />
            </View>
          )}
        </View>

        {/* Selected location info */}
        {coords && (
          <View style={[styles.selectedBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={styles.selectedInfo}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={brandColors.copper} strokeWidth={2.5}>
                <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <Circle cx={12} cy={10} r={3} />
              </Svg>
              <View style={styles.selectedText}>
                <Text style={[styles.placeName, { color: colors.text }]} numberOfLines={1}>{place || 'Dropped pin'}</Text>
                <Text style={[styles.placeCoords, { color: colors.textTertiary }]}>
                  {Math.abs(coords[1]).toFixed(4)}{coords[1] >= 0 ? 'N' : 'S'} / {Math.abs(coords[0]).toFixed(4)}{coords[0] >= 0 ? 'E' : 'W'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: borders.thick,
    borderBottomColor: brandColors.copper,
    backgroundColor: brandColors.black,
  },
  headerTitle: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#e5e5e5',
  },
  cancelBtn: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
  },
  doneBtn: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: brandColors.copper,
  },
  searchWrap: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderWidth: borders.thick,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  locBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  results: {
    marginHorizontal: 12,
    borderWidth: borders.thick,
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultText: {
    fontSize: 14,
    flex: 1,
  },
  mapWrap: {
    flex: 1,
    margin: 12,
    borderWidth: borders.thick,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: borders.thick,
  },
  selectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedText: {
    flex: 1,
  },
  placeName: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: '700',
  },
  placeCoords: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
