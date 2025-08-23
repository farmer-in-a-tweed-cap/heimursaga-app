import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ExpandedWaypointViewProps {
  waypoint: {
    lat: number;
    lon: number;
    date: Date;
    post?: {
      id: string;
      title: string;
      content: string;
      date?: Date;
      bookmarked: boolean;
      author: {
        username: string;
        picture: string;
        creator?: boolean;
      };
      trip?: {
        id: string;
        title: string;
      };
      media?: Array<{
        id: string;
        url: string;
        type: 'image' | 'video';
        caption?: string;
      }>;
    };
    waypoint?: {
      id: number;
      title: string;
      date: Date;
    };
  };
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

export const ExpandedWaypointView: React.FC<ExpandedWaypointViewProps> = ({
  waypoint,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        {waypoint.post ? (
          <Text style={styles.titleLarge}>
            {waypoint.post.title}
          </Text>
        ) : waypoint.waypoint ? (
          <Text style={styles.titleLarge}>
            {waypoint.waypoint.title || 'Waypoint'}
          </Text>
        ) : (
          <Text style={styles.titleLarge}>Unknown Location</Text>
        )}

        {/* Centered metadata */}
        <View style={styles.metadataSection}>
          {/* Date */}
          <Text style={styles.metadataText}>
            {formatDate(waypoint.date)}
          </Text>
          
          {/* Coordinates */}
          <Text style={styles.metadataPrimary}>
            {waypoint.lat.toFixed(4)}, {waypoint.lon.toFixed(4)}
          </Text>
          
          {/* Place */}
          {waypoint.post?.place && (
            <Text style={styles.metadataPrimary}>
              {waypoint.post.place}
            </Text>
          )}
          
          {/* Journey */}
          {waypoint.post?.trip && (
            <Text style={styles.metadataText}>
              Part of trip: {waypoint.post.trip.title}
            </Text>
          )}
          
          {/* Author */}
          {waypoint.post && (
            <Text style={styles.metadataText}>
              by <Text style={styles.usernameBold}>{waypoint.post.author.username || 'Anonymous'}</Text>
              {waypoint.post.author.creator && (
                <Text style={styles.creatorBadgeLarge}> ✓</Text>
              )}
            </Text>
          )}
        </View>

        {/* Content */}
        {waypoint.post?.content && (
          <Text style={styles.contentTextLarge}>
            {waypoint.post.content.replace(/\\n/g, '\n')}
          </Text>
        )}

        {/* Media - After content like web app */}
        {(() => {
          console.log('ExpandedWaypointView: Checking media data:', waypoint.post?.media);
          if (waypoint.post?.media && waypoint.post.media.length > 0) {
            console.log('ExpandedWaypointView: Found', waypoint.post.media.length, 'media items');
            waypoint.post.media.forEach((media, index) => {
              console.log(`Media ${index} full object:`, media);
              console.log(`Media ${index} keys:`, Object.keys(media));
              console.log(`Media ${index} properties:`, { type: media.type, url: media.url, caption: media.caption });
            });
          }
          return waypoint.post?.media && waypoint.post.media.length > 0;
        })() && (
          <View style={styles.mediaSection}>
            {waypoint.post.media.map((media, index) => (
              <View key={media.id || index} style={styles.mediaItem}>
                {media.thumbnail ? (
                  <Image
                    source={{ uri: media.thumbnail }}
                    style={styles.mediaImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.log('ExpandedWaypointView: Image load error:', error.nativeEvent.error);
                      console.log('ExpandedWaypointView: Failed image URL:', media.thumbnail);
                    }}
                    onLoad={() => {
                      console.log('ExpandedWaypointView: Image loaded successfully:', media.thumbnail);
                    }}
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoText}>📷 No Image</Text>
                  </View>
                )}
                {media.caption && (
                  <Text style={styles.mediaCaption}>{media.caption}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Logged annotation - centered at bottom */}
        <View style={styles.loggedSection}>
          <Text style={styles.loggedText}>
            entry logged on {formatDate(waypoint.post?.createdAt || waypoint.post?.date || waypoint.date)} by {waypoint.post?.author?.username || 'Anonymous'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: '600',
  },

  bookmarkButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookmarkIcon: {
    fontSize: 24,
  },

  bookmarkedIcon: {
    opacity: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },

  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  avatarImageLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  avatarTextLarge: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
  },

  authorInfo: {
    flex: 1,
  },

  usernameLarge: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },

  creatorBadgeLarge: {
    color: '#007AFF',
    fontSize: 18,
  },

  dateLarge: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },

  tripSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  tripLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },

  tripTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    flex: 1,
  },

  titleLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 36,
    marginBottom: 24,
    marginTop: 16,
    textAlign: 'center',
  },

  metadataSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },

  metadataText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },

  usernameBold: {
    fontWeight: '600',
    color: '#1C1C1E',
  },

  metadataPrimary: {
    fontSize: 16,
    color: '#AC6D46',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },

  mediaSection: {
    marginBottom: 24,
  },

  mediaItem: {
    marginBottom: 16,
  },

  mediaImage: {
    width: screenWidth - 40,
    height: (screenWidth - 40) * 0.75, // 4:3 aspect ratio
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },

  videoPlaceholder: {
    width: screenWidth - 40,
    height: (screenWidth - 40) * 0.75,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  videoText: {
    fontSize: 18,
    color: '#8E8E93',
  },

  mediaCaption: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 22,
    marginTop: 8,
    fontStyle: 'italic',
  },

  contentTextLarge: {
    fontSize: 18,
    color: '#1C1C1E',
    lineHeight: 26,
    marginBottom: 32,
  },

  locationSection: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },

  locationHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },

  locationCoordinates: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'Menlo', // Monospace font for coordinates
  },

  placeLarge: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
  },

  loggedSection: {
    paddingTop: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },

  loggedText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
});