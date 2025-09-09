import { Platform } from 'react-native';

// API Configuration
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://192.168.1.196:5001/v1'  // Local development - use your Mac's IP for physical device testing
    : 'https://production-api-url.com/v1', // Replace with actual production URL
  TIMEOUT: 30000,
};

// API Headers
export const API_HEADERS = {
  CONTENT_TYPE: {
    JSON: 'application/json',
    FORM_DATA: 'multipart/form-data',
  },
};

// API Methods
export const API_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
} as const;

// API Routes - matching the web app structure
export const API_ROUTES = {
  // Authentication
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  LOGOUT: '/auth/logout',
  SESSION: '/auth/user',
  RESET_PASSWORD: '/auth/reset-password',
  CHANGE_PASSWORD: '/auth/change-password',
  VERIFY_EMAIL: '/auth/verify-email',
  
  // Posts
  POSTS: {
    GET: '/posts',
    GET_BY_ID: (id: string) => `/posts/${id}`,
    CREATE: '/posts',
    UPDATE: (id: string) => `/posts/${id}`,
    DELETE: (id: string) => `/posts/${id}`,
    LIKE: (id: string) => `/posts/${id}/like`,
    BOOKMARK: (id: string) => `/posts/${id}/bookmark`,
  },
  
  // Users
  USERS: {
    GET: '/users',
    GET_BY_USERNAME: (username: string) => `/users/${username}`,
    FOLLOW: (username: string) => `/users/${username}/follow`,
    UNFOLLOW: (username: string) => `/users/${username}/unfollow`,
    POSTS: (username: string) => `/users/${username}/posts`,
    MAP: (username: string) => `/users/${username}/map`,
  },
  
  // User settings
  USER: {
    POSTS: '/user/posts',
    DRAFTS: '/user/drafts',
    BOOKMARKS: '/user/bookmarks',
    NOTIFICATIONS: '/user/notifications',
    BADGE_COUNT: '/user/badge-count',
    SETTINGS: {
      PROFILE: '/user/settings/profile',
    },
    UPDATE_PICTURE: '/user/picture',
  },
  
  // Map
  MAP: {
    QUERY: '/map/query',
    WAYPOINTS: {
      CREATE: '/map/waypoints',
      UPDATE: (id: number) => `/map/waypoints/${id}`,
      DELETE: (id: number) => `/map/waypoints/${id}`,
      GET_BY_ID: (id: number) => `/map/waypoints/${id}`,
    },
  },
  
  // Trips
  TRIPS: {
    GET: '/trips',
    GET_BY_ID: (id: string) => `/trips/${id}`,
    CREATE: '/trips',
    UPDATE: (id: string) => `/trips/${id}`,
    DELETE: (id: string) => `/trips/${id}`,
  },
  
  // Media Upload
  UPLOAD: '/upload',
  
  // Search
  SEARCH: '/search',
  
  // Messages (for MVP social features)
  MESSAGES: {
    CONVERSATIONS: '/messages/conversations',
    CONVERSATION: (username: string) => `/messages/${username}`,
    SEND: '/messages/send',
    MARK_READ: (messageId: string) => `/messages/${messageId}/read`,
    UNREAD_COUNT: '/messages/unread-count',
  },
} as const;