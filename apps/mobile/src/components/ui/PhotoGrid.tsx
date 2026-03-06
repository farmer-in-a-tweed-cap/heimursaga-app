import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { borders, mono, colors as brandColors } from '@/theme/tokens';

interface PhotoGridProps {
  photos: string[];
  onAdd?: () => void;
  onRemove?: (index: number) => void;
}

export function PhotoGrid({ photos, onAdd, onRemove }: PhotoGridProps) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      {photos.map((uri, i) => (
        <View key={uri} style={[styles.thumb, { borderColor: colors.border }]}>
          <Image source={{ uri }} style={styles.image} />
          {onRemove && (
            <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(i)}>
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {onAdd && (
        <TouchableOpacity
          onPress={onAdd}
          style={[styles.addBtn, { borderColor: colors.textTertiary }]}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={colors.textTertiary} strokeWidth={2}>
            <Path d="M12 5v14M5 12h14" />
          </Svg>
          <Text style={[styles.addText, { color: colors.textTertiary }]}>ADD</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexDirection: 'row',
  },
  thumb: {
    width: 80,
    height: 80,
    borderWidth: borders.thick,
    marginRight: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  addBtn: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addText: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
