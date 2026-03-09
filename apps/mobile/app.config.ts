import { ExpoConfig, ConfigContext } from 'expo/config';

const MAPBOX_DOWNLOAD_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN;
if (!MAPBOX_DOWNLOAD_TOKEN) {
  throw new Error('MAPBOX_DOWNLOADS_TOKEN env var is required for Mapbox SDK builds');
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Heimursaga',
  slug: 'heimursaga',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  scheme: 'heimursaga',
  splash: {
    backgroundColor: '#141109',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.heimursaga.app',
    infoPlist: {
      NSFaceIDUsageDescription: 'Authenticate to unlock Heimursaga',
      NSPhotoLibraryUsageDescription: 'Upload photos to your journal entries',
      NSCameraUsageDescription: 'Take photos for your journal entries',
      NSLocationWhenInUseUsageDescription: 'Show your location on the Explorer Atlas',
    },
  },
  android: {
    package: 'com.heimursaga.app',
    adaptiveIcon: {
      backgroundColor: '#202020',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsImpl: 'mapbox',
        RNMapboxMapsDownloadToken: MAPBOX_DOWNLOAD_TOKEN,
      },
    ],
    'expo-router',
    'expo-secure-store',
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Authenticate to unlock Heimursaga',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Upload photos to your journal entries',
        cameraPermission: 'Take photos for your journal entries',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Show your location on the Explorer Atlas',
      },
    ],
  ],
});
