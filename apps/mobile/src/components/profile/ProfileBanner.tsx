import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { Avatar } from '@/components/ui/Avatar';
import { mono, heading, colors as brandColors } from '@/theme/tokens';
import { Svg, Path, Circle, Rect } from 'react-native-svg';

interface ProfileBannerProps {
  username: string;
  displayName?: string;
  bio?: string;
  location?: string;
  memberSince?: string;
  isPro?: boolean;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  activeExpedition?: string;
  statusLabel?: string;
  statusColor?: string;
}

export function ProfileBanner({
  username,
  displayName,
  bio,
  location,
  memberSince,
  isPro,
  avatarUrl,
  coverPhotoUrl,
  activeExpedition,
  statusLabel,
  statusColor,
}: ProfileBannerProps) {
  const { dark } = useTheme();

  return (
    <View>
      {/* Status bar at top */}
      {statusLabel && (
        <View style={[styles.statusBar, { backgroundColor: statusColor ?? brandColors.copper }]}>
          <View style={styles.statusLeft}>
            <View style={styles.statusDot} />
            <Text style={styles.statusLabel}>{statusLabel}</Text>
          </View>
          {activeExpedition && (
            <Text style={styles.statusRight}>{activeExpedition}</Text>
          )}
        </View>
      )}

      {/* Banner content with overlay */}
      <View
        style={[
          styles.banner,
          {
            backgroundColor: dark
              ? 'rgba(26,42,58,0.9)'
              : 'rgba(200,196,180,0.9)',
          },
        ]}
      >
        {coverPhotoUrl && (
          <Image
            source={{ uri: coverPhotoUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        )}
        <View style={styles.bannerOverlay}>
          <View style={styles.avatarRow}>
            <Avatar size={72} name={username} pro={isPro} imageUrl={avatarUrl} />
            <View style={styles.nameCol}>
              <Text style={styles.username}>{username}</Text>
              {displayName && (
                <Text style={styles.displayName}>{displayName}</Text>
              )}
              <View style={styles.metaRow}>
                {location && (
                  <View style={styles.metaItem}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5}>
                      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <Circle cx={12} cy={10} r={3} />
                    </Svg>
                    <Text style={styles.metaText}>{location}</Text>
                  </View>
                )}
                {memberSince && (
                  <View style={styles.metaItem}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={2.5}>
                      <Rect x={3} y={4} width={18} height={18} rx={0} />
                      <Path d="M16 2v4M8 2v4M3 10h18" />
                    </Svg>
                    <Text style={styles.metaText}>{memberSince}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {bio && (
            <Text style={styles.bio}>{bio}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statusBar: {
    backgroundColor: brandColors.copper,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    backgroundColor: brandColors.green,
  },
  statusLabel: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.72,
    color: '#ffffff',
  },
  statusRight: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  banner: {
    overflow: 'hidden',
  },
  bannerOverlay: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 22,
    backgroundColor: 'rgba(32,32,32,0.65)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  nameCol: {
    flex: 1,
    paddingTop: 6,
  },
  username: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors.copper,
  },
  displayName: {
    fontFamily: heading,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  bio: {
    marginTop: 16,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
