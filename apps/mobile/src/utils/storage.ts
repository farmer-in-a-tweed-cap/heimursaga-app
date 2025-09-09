import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

// Secure storage for sensitive data using Keychain
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await Keychain.setInternetCredentials(key, key, value);
    } catch (error) {
      console.error('Error storing secure item:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getInternetCredentials(key);
      if (credentials && credentials.password) {
        return credentials.password;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await Keychain.resetInternetCredentials(key);
    } catch (error) {
      console.error('Error removing secure item:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await Keychain.resetInternetCredentials('auth_token');
    } catch (error) {
      console.error('Error clearing secure storage:', error);
    }
  },
};

// Regular storage for non-sensitive data
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error storing item:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error retrieving item:', error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item:', error);
      throw error;
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  async setObject(key: string, value: object): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error storing object:', error);
      throw error;
    }
  },

  async getObject<T = any>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error retrieving object:', error);
      return null;
    }
  },
};

// Storage keys constants
export const STORAGE_KEYS = {
  // Secure keys (stored in Keychain)
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  
  // Regular keys (stored in AsyncStorage)
  USER_SESSION: 'user_session',
  APP_SETTINGS: 'app_settings',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  LAST_SYNC: 'last_sync',
  OFFLINE_POSTS: 'offline_posts',
  CACHED_MAP_DATA: 'cached_map_data',
} as const;