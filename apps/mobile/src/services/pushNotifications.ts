import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { notificationsApi } from './api';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Request permission and get the Expo push token. Returns null if unavailable. */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check existing permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    if (__DEV__) console.log('[Push] Permission not granted');
    return null;
  }

  // Get the Expo push token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    'f4482299-df6f-4316-adf8-0802de176580';
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  if (__DEV__) console.log('[Push] Token:', tokenData.data);

  // iOS needs notification channel setup on Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return tokenData.data;
}

/** Send the push token to the API server. */
export async function sendPushTokenToServer(token: string): Promise<void> {
  try {
    await notificationsApi.registerPushToken(token, Platform.OS);
    if (__DEV__) console.log('[Push] Token registered with server');
  } catch (e) {
    if (__DEV__) console.log('[Push] Failed to register token with server:', e);
  }
}

/** Remove the push token from the API server (e.g. on logout). */
export async function removePushTokenFromServer(token: string): Promise<void> {
  try {
    await notificationsApi.removePushToken(token);
    if (__DEV__) console.log('[Push] Token removed from server');
  } catch {
    // Best effort — don't block logout
  }
}
