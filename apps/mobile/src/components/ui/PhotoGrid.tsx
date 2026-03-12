import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { borders, mono, colors as brandColors } from '@/theme/tokens';

export interface PhotoItem {
  /** Stable local identifier for this photo (avoids stale-index race conditions) */
  _id: string;
  uri: string;
  uploadId?: string;
  thumbnail?: string;
  uploading?: boolean;
  failed?: boolean;
}

interface PhotoGridProps {
  photos: PhotoItem[];
  coverIndex?: number;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  onSetCover?: (index: number) => void;
  onRetry?: (index: number) => void;
  maxPhotos?: number;
}

export function PhotoGrid({ photos, coverIndex, onAdd, onRemove, onSetCover, onRetry, maxPhotos }: PhotoGridProps) {
  const { colors } = useTheme();
  const atLimit = maxPhotos != null && photos.length >= maxPhotos;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      {photos.map((photo, i) => (
        <View key={photo._id} style={[styles.thumb, { borderColor: coverIndex === i ? brandColors.copper : colors.border }]}>
          <Image source={{ uri: photo.thumbnail ?? photo.uri }} style={styles.image} />
          {/* Upload overlay */}
          {photo.uploading && (
            <View style={styles.overlay}>
              <ActivityIndicator color="#fff" size="small" />
            </View>
          )}
          {photo.failed && (
            <TouchableOpacity style={styles.overlay} onPress={() => onRetry?.(i)}>
              <Text style={styles.retryText}>RETRY</Text>
            </TouchableOpacity>
          )}
          {/* Cover badge */}
          {coverIndex === i && (
            <View style={styles.coverBadge}>
              <Text style={styles.coverText}>COVER</Text>
            </View>
          )}
          {/* Actions */}
          {!photo.uploading && !photo.failed && onSetCover && coverIndex !== i && (
            <TouchableOpacity style={styles.coverBtn} onPress={() => onSetCover(i)} hitSlop={4}>
              <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5}>
                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
              </Svg>
            </TouchableOpacity>
          )}
          {onRemove && (
            <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(i)}>
              <Text style={styles.removeText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
      {onAdd && !atLimit && (
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: '700',
    color: brandColors.red,
    letterSpacing: 0.5,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: brandColors.copper,
    paddingVertical: 2,
    alignItems: 'center',
  },
  coverText: {
    fontFamily: mono,
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  coverBtn: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 18,
    height: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
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
