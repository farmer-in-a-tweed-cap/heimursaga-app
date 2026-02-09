/**
 * API Service Layer
 * Centralized API client for all backend calls
 */

// Get API URL from environment, enforce HTTPS in production
const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  const defaultUrl = 'http://localhost:5001/v1';
  let url = envUrl || defaultUrl;

  // Enforce HTTPS in production (not localhost)
  if (typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      url.startsWith('http://') &&
      !url.includes('localhost') &&
      !url.includes('127.0.0.1')) {
    url = url.replace('http://', 'https://');
  }

  return url;
};

const API_BASE_URL = getApiBaseUrl();

// CSRF token management — fetched once per session, refreshed on 403
let csrfToken: string | null = null;

/** Clear cached CSRF token (call on logout to force re-fetch) */
export function clearCsrfToken() {
  csrfToken = null;
}

async function fetchCsrfToken(): Promise<string> {
  // CSRF endpoint is at root level (no /v1 prefix)
  const baseUrl = API_BASE_URL.replace(/\/v\d+$/, '');
  const res = await fetch(`${baseUrl}/csrf-token`, { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken!;
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrfToken();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    let errorCode: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      errorCode = errorData.code;
    } catch {
      // Response body wasn't JSON
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(response.status, errorMessage, errorCode);
  }

  // Handle empty responses (204 No Content, etc.)
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {};

  // Copy custom headers if provided
  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(customHeaders)) {
      customHeaders.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, customHeaders);
    }
  }

  const config: RequestInit = {
    ...restOptions,
    headers,
    credentials: 'include', // Important: include cookies for session auth
  };

  // Only set Content-Type and body if there's actual content to send
  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  // Include CSRF token on state-changing requests
  const method = (restOptions.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    try {
      headers['x-csrf-token'] = await getCsrfToken();
    } catch {
      // If CSRF token fetch fails, proceed without it
    }
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If we get a 401 (session expired) or 403 (CSRF token expired), refresh CSRF and retry once
  if ((response.status === 401 || response.status === 403) && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    try {
      csrfToken = null;
      headers['x-csrf-token'] = await fetchCsrfToken();
      const retryConfig: RequestInit = { ...config, headers };
      response = await fetch(`${API_BASE_URL}${endpoint}`, retryConfig);
    } catch {
      // If retry fails, return the original 403 response
    }
  }

  return handleResponse<T>(response);
}

// API methods
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Auth types matching API
export interface SessionUser {
  id: number;
  role: string;
  username: string;
  email: string;
  picture?: string;
  isEmailVerified: boolean;
  isPremium: boolean;
  stripeAccountConnected?: boolean;
  createdAt?: string;
}

export interface LoginPayload {
  login: string;
  password: string;
  remember?: boolean;
}

export interface SignupPayload {
  email: string;
  username: string;
  password: string;
  recaptchaToken?: string;
}

export interface PasswordResetPayload {
  email: string;
}

export interface PasswordUpdatePayload {
  token: string;
  password: string;
}

// Auth API endpoints
export const authApi = {
  /**
   * Login with email/username and password
   * Sets session cookie on success
   */
  login: (payload: LoginPayload) =>
    api.post<void>('/auth/login', payload),

  /**
   * Register a new account
   * Sets session cookie on success
   */
  signup: (payload: SignupPayload) =>
    api.post<void>('/auth/signup', payload),

  /**
   * Logout current user
   * Clears session cookie
   */
  logout: () =>
    api.post<void>('/auth/logout'),

  /**
   * Get current session user
   * Returns user data if authenticated, throws 401/403 if not
   */
  getUser: () =>
    api.get<SessionUser>('/auth/user'),

  /**
   * Request password reset email
   */
  requestPasswordReset: (payload: PasswordResetPayload) =>
    api.post<void>('/auth/reset-password', payload),

  /**
   * Reset password with token
   */
  resetPassword: (payload: PasswordUpdatePayload) =>
    api.post<void>('/auth/change-password', payload),

  /**
   * Validate a password reset token
   */
  validateToken: (token: string) =>
    api.get<void>(`/auth/tokens/${token}`),

  /**
   * Send email verification
   */
  sendEmailVerification: (email: string) =>
    api.post<void>('/auth/send-email-verification', { email }),

  /**
   * Verify email with token
   */
  verifyEmail: (token: string) =>
    api.post<void>('/auth/verify-email', { token }),

  /**
   * Resend email verification (requires auth)
   */
  resendEmailVerification: () =>
    api.post<{ success: boolean; message: string }>('/auth/resend-email-verification'),
};

// Explorer types matching API
export interface ExplorerProfile {
  username: string;
  picture: string;
  coverPhoto?: string;
  bio?: string;
  name?: string;
  memberDate?: string;
  locationFrom?: string;
  locationLives?: string;
  sponsorsFund?: string;
  sponsorsFundType?: string;
  sponsorsFundExpeditionId?: string;
  portfolio?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  equipment?: string[];
  followed?: boolean;
  bookmarked?: boolean;
  you?: boolean;
  creator?: boolean;
  stripeAccountConnected?: boolean;
}

export interface ExplorerListItem {
  username: string;
  role?: string;
  name?: string;
  picture?: string;
  bio?: string;
  locationFrom?: string;
  locationLives?: string;
  locationFromLat?: number;
  locationFromLon?: number;
  locationLivesLat?: number;
  locationLivesLon?: number;
  entriesCount?: number;
  postsCount?: number;
  memberDate?: string;
  creator?: boolean;
  blocked?: boolean;
  followed?: boolean;
  // Expedition data for status calculation
  recentExpeditions?: Array<{
    id: string;
    title: string;
    status: string;
    daysActive?: number;
  }>;
}

export interface ExplorerEntry {
  id: string; // publicId from API
  publicId?: string; // alias for compatibility
  title: string;
  content?: string;
  sponsored?: boolean;
  lat?: number;
  lon?: number;
  countryCode?: string; // ISO 3166-1 alpha-2 country code
  date?: string;
  place?: string;
  createdAt?: string;
  likesCount?: number;
  bookmarksCount?: number;
  wordCount?: number;
  liked?: boolean;
  bookmarked?: boolean;
  you?: boolean;
  waypoint?: {
    id: number;
    lat: number;
    lon: number;
  };
  expedition?: {
    id: string;
    title: string;
    publicId?: string; // alias
  };
  author?: {
    name?: string;
    username: string;
    picture?: string;
    creator?: boolean;
  };
  media?: Array<{
    url: string;
    type: string;
  }>;
}

export interface ExplorerExpedition {
  id: string;
  publicId?: string; // alias for compatibility
  title: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  entriesCount?: number;
  goal?: number;
  raised?: number;
  sponsorsCount?: number;
}

export interface ExplorerFollower {
  username: string;
  picture?: string;
  bio?: string;
  followed?: boolean;
  creator?: boolean;
}

// Explorer API endpoints
export const explorerApi = {
  /**
   * Get all explorers
   */
  getAll: () =>
    api.get<{ data: ExplorerListItem[]; results: number }>('/users'),

  /**
   * Get explorer profile by username
   */
  getByUsername: (username: string) =>
    api.get<ExplorerProfile>(`/users/${username}`),

  /**
   * Get explorer's entries/posts
   */
  getEntries: (username: string) =>
    api.get<{ data: ExplorerEntry[]; results: number }>(`/users/${username}/posts`),

  /**
   * Get explorer's expeditions
   */
  getExpeditions: (username: string) =>
    api.get<{ data: ExplorerExpedition[]; results: number }>(`/users/${username}/trips`),

  /**
   * Get explorer's map data
   */
  getMap: (username: string) =>
    api.get<unknown>(`/users/${username}/map`),

  /**
   * Get explorer's followers
   */
  getFollowers: (username: string) =>
    api.get<{ data: ExplorerFollower[]; results: number }>(`/users/${username}/followers`),

  /**
   * Get explorer's following
   */
  getFollowing: (username: string) =>
    api.get<{ data: ExplorerFollower[]; results: number }>(`/users/${username}/following`),

  /**
   * Follow an explorer (requires auth)
   */
  follow: (username: string) =>
    api.post<void>(`/users/${username}/follow`),

  /**
   * Unfollow an explorer (requires auth)
   */
  unfollow: (username: string) =>
    api.post<void>(`/users/${username}/unfollow`),

  /**
   * Bookmark/unbookmark an explorer (toggle)
   */
  bookmark: (username: string) =>
    api.post<{ bookmarked: boolean }>(`/users/${username}/bookmark`),

  /**
   * Get explorer's sponsorship tiers
   */
  getSponsorshipTiers: (username: string) =>
    api.get<unknown>(`/users/${username}/sponsorship-tiers`),

  /**
   * Get current user's profile settings (requires auth)
   */
  getProfileSettings: () =>
    api.get<{ username?: string; email?: string; name?: string; bio?: string; from?: string; livesIn?: string; website?: string; twitter?: string; instagram?: string; youtube?: string; picture?: string; coverPhoto?: string; equipment?: string[] }>('/user/settings/profile'),

  /**
   * Update current user's profile settings (requires auth)
   */
  updateProfile: (payload: {
    name?: string;
    bio?: string;
    from?: string;
    livesIn?: string;
    website?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  }) =>
    api.put<void>('/user/settings/profile', payload),

  /**
   * Upload profile picture (requires auth)
   */
  uploadPicture: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/user/picture`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, `Failed to upload picture: ${errorText}`);
    }

    // Handle empty response (endpoint returns void)
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  },

  /**
   * Upload cover photo (requires auth)
   */
  uploadCoverPhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/user/cover`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, `Failed to upload cover photo: ${errorText}`);
    }

    // Handle empty response (endpoint returns void)
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  },

  /**
   * Get current user's bookmarked entries (requires auth)
   */
  getBookmarkedEntries: () =>
    api.get<{ data: ExplorerEntry[]; results: number }>('/user/bookmarks'),

  /**
   * Get current user's bookmarked expeditions (requires auth)
   */
  getBookmarkedExpeditions: () =>
    api.get<{
      data: Array<{
        id: string;
        title: string;
        description?: string;
        status: string;
        startDate?: string;
        endDate?: string;
        coverPhoto?: string;
        goal?: number;
        raised?: number;
        sponsorsCount?: number;
        entriesCount?: number;
        bookmarksCount?: number;
        explorer: {
          username: string;
          name?: string;
          picture?: string;
        };
        bookmarkedAt?: string;
      }>;
      results: number;
    }>('/user/bookmarks/expeditions'),

  /**
   * Get current user's bookmarked explorers (requires auth)
   */
  getBookmarkedExplorers: () =>
    api.get<{
      data: Array<{
        username: string;
        name?: string;
        bio?: string;
        picture?: string;
        locationFrom?: string;
        locationLives?: string;
        isPremium?: boolean;
        entriesCount?: number;
        expeditionsCount?: number;
        followersCount?: number;
        bookmarkedAt?: string;
      }>;
      results: number;
    }>('/user/bookmarks/explorers'),

  /**
   * Get current user's expeditions (requires auth)
   * This returns all expeditions regardless of public status or waypoint count
   */
  getMyExpeditions: () =>
    api.get<{ data: ExplorerExpedition[]; results: number }>('/user/trips'),
};

// Expedition types matching API
export interface ExpeditionWaypoint {
  id: number | string;
  title: string;
  description?: string;
  lat?: number;
  lon?: number;
  date?: string;
  sequence?: number;
  entry?: {
    id: string;
    title: string;
    content?: string;
    author?: {
      username: string;
      name?: string;
      picture?: string;
    };
  };
}

export interface ExpeditionEntry {
  id: string;
  title: string;
  content?: string;
  date?: string;
  place?: string;
  lat?: number;
  lon?: number;
  mediaCount?: number;
  author?: {
    username: string;
    name?: string;
    picture?: string;
  };
}

export interface Expedition {
  id?: string;
  publicId?: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string;
  entriesCount?: number;
  waypointsCount?: number;
  goal?: number;
  raised?: number;
  sponsorsCount?: number;
  recurringStats?: {
    activeSponsors: number;
    monthlyRevenue: number;
    totalCommitted: number;
  };
  sponsors?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    message?: string;
    isPublic: boolean;
    isMessagePublic: boolean;
    createdAt?: string;
    user?: {
      username: string;
      name?: string;
      picture?: string;
    };
    tier?: {
      id: string;
      description?: string;
      price: number;
    };
  }>;
  public?: boolean;
  category?: string;
  region?: string;
  tags?: string[];
  isRoundTrip?: boolean;
  routeMode?: string;
  routeGeometry?: number[][];
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  currentLocationVisibility?: 'public' | 'sponsors' | 'private';
  explorer?: {
    username: string;
    name?: string;
    picture?: string;
  };
  author?: {
    username: string;
    name?: string;
    picture?: string;
    creator?: boolean;
  };
  waypoints?: ExpeditionWaypoint[];
  entries?: ExpeditionEntry[];
  bookmarked?: boolean;
  followingAuthor?: boolean;
}

export interface ExpeditionCreatePayload {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  goal?: number;
  coverImage?: string;
  category?: string;
  region?: string;
  tags?: string[];
  isRoundTrip?: boolean;
  routeMode?: string;
  routeGeometry?: number[][];
}

// Expedition Note types
export interface ExpeditionNoteReply {
  id: number;
  noteId: number;
  authorId: string;
  authorName: string;
  authorPicture?: string;
  isExplorer: boolean;
  text: string;
  timestamp: string;
}

export interface ExpeditionNote {
  id: number;
  text: string;
  timestamp: string;
  expeditionStatus: 'PLANNING' | 'ACTIVE' | 'COMPLETE';
  replies: ExpeditionNoteReply[];
}

export interface ExpeditionNotesResponse {
  notes: ExpeditionNote[];
  dailyLimit: {
    used: number;
    max: number;
  };
}

// Expedition API endpoints
export const expeditionApi = {
  /**
   * Get all expeditions
   */
  getAll: () =>
    api.get<{ data: Expedition[]; results: number }>('/trips'),

  /**
   * Get expedition by ID
   */
  getById: (id: string) =>
    api.get<Expedition>(`/trips/${id}`),

  /**
   * Create a new expedition (requires auth)
   */
  create: (payload: ExpeditionCreatePayload) =>
    api.post<Expedition>('/trips', payload),

  /**
   * Update an expedition (requires auth)
   */
  update: (id: string, payload: ExpeditionCreatePayload) =>
    api.put<Expedition>(`/trips/${id}`, payload),

  /**
   * Delete an expedition (requires auth)
   */
  delete: (id: string) =>
    api.delete<void>(`/trips/${id}`),

  /**
   * Create a waypoint for an expedition
   */
  createWaypoint: (expeditionId: string, payload: { title: string; lat: number; lon: number; date?: string; description?: string; sequence?: number }) =>
    api.post<unknown>(`/trips/${expeditionId}/waypoints`, payload),

  /**
   * Update a waypoint
   */
  updateWaypoint: (expeditionId: string, waypointId: string, payload: { title?: string; lat?: number; lon?: number; date?: string; description?: string; sequence?: number }) =>
    api.put<unknown>(`/trips/${expeditionId}/waypoints/${waypointId}`, payload),

  /**
   * Delete a waypoint
   */
  deleteWaypoint: (expeditionId: string, waypointId: string) =>
    api.delete<void>(`/trips/${expeditionId}/waypoints/${waypointId}`),

  /**
   * Update current location of an expedition (requires auth, owner only)
   */
  updateLocation: (id: string, source: 'waypoint' | 'entry', locationId: string, visibility?: 'public' | 'sponsors' | 'private') =>
    api.patch<void>(`/trips/${id}/location`, { source, locationId, visibility }),

  /**
   * Bookmark/unbookmark an expedition (toggle)
   */
  bookmark: (id: string) =>
    api.post<{ bookmarksCount: number }>(`/trips/${id}/bookmark`),

  /**
   * Get notes for an expedition (requires auth - owner or sponsor)
   */
  getNotes: (expeditionId: string) =>
    api.get<ExpeditionNotesResponse>(`/trips/${expeditionId}/notes`),

  /**
   * Get note count for an expedition (public)
   */
  getNoteCount: (expeditionId: string) =>
    api.get<{ count: number }>(`/trips/${expeditionId}/notes/count`),

  /**
   * Create a note (owner only)
   */
  createNote: (expeditionId: string, text: string) =>
    api.post<{ noteId: number }>(`/trips/${expeditionId}/notes`, { text }),

  /**
   * Create a reply to a note (owner or sponsor)
   */
  createNoteReply: (expeditionId: string, noteId: number, text: string) =>
    api.post<{ replyId: number }>(`/trips/${expeditionId}/notes/${noteId}/replies`, { text }),

  /**
   * Delete a note (owner only)
   */
  deleteNote: (expeditionId: string, noteId: number) =>
    api.delete<void>(`/trips/${expeditionId}/notes/${noteId}`),
};

// Entry types matching API response from getById
export interface Entry {
  id: string; // publicId
  publicId?: string; // alias for compatibility
  title: string;
  content?: string;
  sponsored?: boolean;
  public?: boolean;
  isDraft?: boolean;
  date?: string;
  place?: string;
  createdAt?: string;
  // Coordinates stored directly on entry (entries are distinct from waypoints)
  lat?: number;
  lon?: number;
  // Stats
  mediaCount?: number;
  wordCount?: number;
  likesCount?: number;
  bookmarksCount?: number;
  commentsCount?: number;
  commentsEnabled?: boolean;
  liked?: boolean;
  bookmarked?: boolean;
  createdByMe?: boolean;
  followingAuthor?: boolean;
  trip?: {
    id: string;
    title: string;
    entriesCount?: number;
  };
  // Alias for compatibility
  expedition?: {
    id: string;
    publicId?: string;
    title: string;
    entriesCount?: number;
  };
  author?: {
    username: string;
    name?: string;
    picture?: string;
    creator?: boolean;
  };
  // Alias for compatibility
  explorer?: {
    username: string;
    name?: string;
    picture?: string;
  };
  media?: Array<{
    id?: string;
    thumbnail?: string;
    original?: string;
    caption?: string;
    altText?: string;
    credit?: string;
    // Legacy fields
    url?: string;
    type?: string;
  }>;
  // New fields
  entryType?: 'standard' | 'photo-essay' | 'data-log' | 'waypoint';
  coverImage?: string;
  isMilestone?: boolean;
  visibility?: 'public' | 'sponsors-only' | 'private';
  // Entry number within expedition (calculated on the fly)
  entryNumber?: number;
  // Day of the expedition when this entry was written
  expeditionDay?: number;
}

export interface EntryCreatePayload {
  title: string;
  content?: string;
  expeditionId?: string;
  lat?: number;
  lon?: number;
  date?: string;
  place?: string;
  public?: boolean;
  sponsored?: boolean;
  uploads?: string[];
  uploadCaptions?: { [uploadId: string]: string };
  uploadAltTexts?: { [uploadId: string]: string };
  uploadCredits?: { [uploadId: string]: string };
  waypointId?: number;
  isDraft?: boolean;
  commentsEnabled?: boolean;
  // New fields
  entryType?: 'standard' | 'photo-essay' | 'data-log' | 'waypoint';
  coverUploadId?: string;
  isMilestone?: boolean;
  visibility?: 'public' | 'sponsors-only' | 'private';
}

// Entry API endpoints
export const entryApi = {
  /**
   * Get all entries
   */
  getAll: () =>
    api.get<{ data: Entry[]; results: number }>('/posts'),

  /**
   * Get entry by ID
   */
  getById: (id: string) =>
    api.get<Entry>(`/posts/${id}`),

  /**
   * Get user's drafts (requires auth)
   */
  getDrafts: () =>
    api.get<{ data: Entry[]; results: number }>('/posts/drafts'),

  /**
   * Create a new entry (requires auth)
   * Returns { id: string } where id is the publicId of the created entry
   */
  create: (payload: EntryCreatePayload) =>
    api.post<{ id: string }>('/posts', payload),

  /**
   * Update an entry (requires auth)
   */
  update: (id: string, payload: EntryCreatePayload) =>
    api.put<Entry>(`/posts/${id}`, payload),

  /**
   * Delete an entry (requires auth)
   */
  delete: (id: string) =>
    api.delete<void>(`/posts/${id}`),

  /**
   * Like an entry (requires auth)
   */
  like: (id: string) =>
    api.post<void>(`/posts/${id}/like`),

  /**
   * Bookmark an entry (requires auth)
   */
  bookmark: (id: string) =>
    api.post<void>(`/posts/${id}/bookmark`),
};

// Comment types matching API
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    username: string;
    picture?: string;
    creator?: boolean;
  };
  createdByMe: boolean;
  parentId?: string;
  repliesCount?: number;
  replies?: Comment[];
}

export interface CommentListResponse {
  data: Comment[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Comment API endpoints
export const commentApi = {
  /**
   * Get comments for an entry
   */
  getByEntryId: (entryId: string, limit?: number, cursor?: string) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (cursor) params.set('cursor', cursor);
    const query = params.toString();
    return api.get<CommentListResponse>(`/posts/${entryId}/comments${query ? `?${query}` : ''}`);
  },

  /**
   * Create a comment (requires auth)
   */
  create: (entryId: string, content: string, parentId?: string) =>
    api.post<Comment>(`/posts/${entryId}/comments`, { content, parentId }),

  /**
   * Update a comment (requires auth)
   */
  update: (commentId: string, content: string) =>
    api.put<Comment>(`/comments/${commentId}`, { content }),

  /**
   * Delete a comment (requires auth)
   */
  delete: (commentId: string) =>
    api.delete<{ success: boolean }>(`/comments/${commentId}`),
};

// Notification types matching API
export interface Notification {
  context: string;
  date: string;
  read?: boolean;
  mentionUser?: {
    username: string;
    name?: string;
    picture?: string;
  };
  body?: string;
  postId?: string;
  postTitle?: string;
  sponsorshipType?: string;
  sponsorshipAmount?: number;
  sponsorshipCurrency?: string;
  // Passport fields
  passportCountryCode?: string;
  passportCountryName?: string;
  passportContinentCode?: string;
  passportContinentName?: string;
  passportStampId?: string;
  passportStampName?: string;
}

export interface NotificationListResponse {
  results: number;
  data: Notification[];
  page: number;
}

export interface BadgeCountResponse {
  notifications: number;
}

// Notification API endpoints
export const notificationApi = {
  /**
   * Get all notifications for the current user (requires auth)
   */
  getAll: () =>
    api.get<NotificationListResponse>('/user/notifications'),

  /**
   * Mark all notifications as read (requires auth)
   */
  markAllAsRead: () =>
    api.post<void>('/user/notifications/mark-read'),

  /**
   * Get badge count (unread notifications) (requires auth)
   */
  getBadgeCount: () =>
    api.get<BadgeCountResponse>('/user/badge-count'),
};

// Upload types
export interface UploadResponse {
  uploadId: string;
  original: string;
  thumbnail: string;
}

// Search types matching API
export interface SearchUser {
  id: string;
  username: string;
  picture: string | null;
  role: string;
}

export interface SearchEntry {
  id: string;
  title: string;
  place: string | null;
  date: string | null;
  lat: number | null;
  lon: number | null;
  author: {
    username: string;
  };
}

export interface SearchResponse {
  success: boolean;
  data: {
    users: SearchUser[];
    entries: SearchEntry[];
  };
}

// Search API endpoints
export const searchApi = {
  /**
   * Search for users and entries
   */
  search: (query: string) =>
    api.post<SearchResponse>('/search', { search: query }),
};

// Message types matching API
export interface MessageUser {
  username: string;
  name?: string;
  picture?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: number;
  recipientId: number;
  isRead: boolean;
  createdAt: string;
  sender: MessageUser;
  recipient: MessageUser;
}

export interface ConversationLastMessage {
  content: string;
  createdAt: string;
  isFromMe: boolean;
}

export interface Conversation {
  recipientUsername: string;
  recipientName?: string;
  recipientPicture?: string;
  lastMessage: ConversationLastMessage;
  unreadCount: number;
}

export interface SendMessagePayload {
  content: string;
  recipientUsername: string;
}

// Message API endpoints (Explorer Pro only)
export const messageApi = {
  /**
   * Send a message to another Explorer Pro member
   */
  send: (payload: SendMessagePayload) =>
    api.post<void>('/messages/send', payload),

  /**
   * Get all conversations for the current user
   */
  getConversations: () =>
    api.get<Conversation[]>('/messages/conversations'),

  /**
   * Get all messages in a conversation with a specific user
   */
  getConversation: (username: string) =>
    api.get<Message[]>(`/messages/conversations/${username}`),

  /**
   * Mark a specific message as read
   */
  markAsRead: (messageId: string) =>
    api.patch<void>(`/messages/mark-read/${messageId}`),

  /**
   * Get the count of unread messages
   */
  getUnreadCount: () =>
    api.get<{ count: number }>('/messages/unread-count'),
};

// Upload API endpoints
export const uploadApi = {
  /**
   * Upload a file (image)
   */
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, `Failed to upload file: ${errorText}`);
    }

    return response.json();
  },
};

// Insights types
export interface PostInsight {
  id: string;
  title: string;
  createdAt: string;
  bookmarksCount: number;
  commentsCount: number;
  viewsCount: number;
  uniqueViewersCount: number;
}

export interface PostInsightsResponse {
  posts: PostInsight[];
}

export interface BalanceAmount {
  amount: number;
  currency: string;
  symbol: string;
}

export interface BalanceResponse {
  available: BalanceAmount;
  pending: BalanceAmount;
}

// Alias for backward compatibility
export type PayoutBalance = BalanceResponse;

export interface PayoutMethod {
  id: string;
  businessName?: string;
  businessType?: string;
  email?: string;
  phoneNumber?: string;
  platform: string;
  isVerified: boolean;
  stripeAccountId?: string;
  currency?: string;
  country?: string;
  automaticPayouts?: {
    enabled: boolean;
    schedule: {
      interval: 'manual' | 'daily' | 'weekly' | 'monthly';
      delayDays?: number;
    };
  };
}

export interface PayoutMethodsResponse {
  results: number;
  data: PayoutMethod[];
}

export interface Payout {
  id: string;
  amount: number;
  status: string;
  currency: {
    code: string;
    symbol: string;
  };
  created: string;
  arrival?: string;
}

export interface PayoutsResponse {
  results: number;
  data: Payout[];
}

export interface SponsorshipTier {
  id: string;
  price: number;
  description: string;
  isAvailable: boolean;
  membersCount: number;
}

export interface SponsorshipTiersResponse {
  results: number;
  data: SponsorshipTier[];
}

export interface Sponsorship {
  id: string;
  status: string;
  type: string;
  createdAt?: string;
  sponsor?: {
    username: string;
    name?: string;
    picture?: string;
  };
  tier?: {
    id: string;
    description: string;
    title: string;
  };
}

export interface SponsorshipsResponse {
  results: number;
  data: Sponsorship[];
}

// Insights API endpoints (Pro features)
export const insightsApi = {
  /**
   * Get entry/post performance insights (requires auth)
   */
  getPostInsights: () =>
    api.get<PostInsightsResponse>('/user/insights/post'),

  /**
   * Get creator balance (requires auth + creator role)
   */
  getBalance: () =>
    api.get<BalanceResponse>('/balance'),

  /**
   * Get payout methods (requires auth)
   */
  getPayoutMethods: () =>
    api.get<PayoutMethodsResponse>('/payout-methods'),

  /**
   * Get payout history (requires auth + creator role)
   */
  getPayouts: () =>
    api.get<PayoutsResponse>('/payouts'),

  /**
   * Get sponsorship tiers for the current user (requires auth)
   */
  getSponsorshipTiers: () =>
    api.get<SponsorshipTiersResponse>('/sponsorship-tiers'),

  /**
   * Get sponsorships received by current user (requires auth + creator role)
   */
  getSponsorships: () =>
    api.get<SponsorshipsResponse>('/sponsorships'),
};

// ============================================
// PLAN / SUBSCRIPTION API
// ============================================

export interface Plan {
  id: string;
  slug: string;
  name: string;
  priceMonth: number;
  priceYear: number;
  discountYear: number;
  features?: string[];
}

export interface PlansResponse {
  data: Plan[];
}

export interface SubscriptionStatus {
  id: string;
  planSlug: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface UpgradeCheckoutPayload {
  planSlug: string;
  billingPeriod?: 'MONTHLY' | 'YEARLY';
  promoCode?: string;
}

export interface UpgradeCheckoutResponse {
  clientSecret: string;
  subscriptionId?: string;
}

export interface PromoValidationResponse {
  valid: boolean;
  discountPercent?: number;
  discountAmount?: number;
  finalPrice?: number;
}

export const planApi = {
  /**
   * Get all available plans
   */
  getPlans: () =>
    api.get<PlansResponse>('/plans'),

  /**
   * Get a specific plan by slug
   */
  getPlanBySlug: (slug: string) =>
    api.get<Plan>(`/plans/${slug}`),

  /**
   * Get current user's subscription status
   */
  getSubscription: () =>
    api.get<{ subscription: SubscriptionStatus | null }>('/user/subscription'),

  /**
   * Start upgrade checkout flow (creates Stripe subscription with pending payment)
   */
  createUpgradeCheckout: (payload: UpgradeCheckoutPayload) =>
    api.post<UpgradeCheckoutResponse>('/checkout/subscription-upgrade', payload),

  /**
   * Complete the subscription upgrade after payment succeeds
   */
  completeUpgrade: () =>
    api.post<{ success: boolean }>('/checkout/subscription-upgrade/complete'),

  /**
   * Cancel subscription (will remain active until period end)
   */
  cancelSubscription: () =>
    api.post<{ success: boolean }>('/subscription/cancel'),

  /**
   * Validate a promo/coupon code
   */
  validatePromoCode: (code: string, planSlug: string) =>
    api.post<PromoValidationResponse>('/promo/validate', { code, planSlug }),
};

// ============================================
// PAYMENT METHOD API
// ============================================

export interface PaymentMethodFull {
  id: string;
  label: string;
  last4: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  isDefault?: boolean;
}

export interface PaymentMethodsFullResponse {
  results: number;
  data: PaymentMethodFull[];
}

export interface SetupIntentResponse {
  clientSecret: string;
}

export const paymentMethodApi = {
  /**
   * Get all saved payment methods
   */
  getAll: () =>
    api.get<PaymentMethodsFullResponse>('/payment-methods'),

  /**
   * Get a specific payment method by ID
   */
  getById: (paymentMethodId: string) =>
    api.get<PaymentMethodFull>(`/payment-methods/${paymentMethodId}`),

  /**
   * Create a setup intent for adding a new payment method
   */
  createSetupIntent: () =>
    api.post<SetupIntentResponse>('/payment-methods/setup-intent'),

  /**
   * Add a new payment method using a Stripe payment method ID
   */
  create: (stripePaymentMethodId: string) =>
    api.post<{ id: string }>('/payment-methods', { stripePaymentMethodId }),

  /**
   * Set a payment method as default
   */
  setDefault: (paymentMethodId: string) =>
    api.post<{ success: boolean }>(`/payment-methods/${paymentMethodId}/default`),

  /**
   * Delete a payment method
   */
  delete: (paymentMethodId: string) =>
    api.delete<{ success: boolean }>(`/payment-methods/${paymentMethodId}`),
};

// ============================================
// SPONSORSHIP API (Enhanced for Explorer-Level Model)
// ============================================

export interface SponsorshipCheckoutPayload {
  sponsorshipTierId: string;
  creatorId: string; // username of the explorer to sponsor
  paymentMethodId: string;
  sponsorshipType: 'one_time_payment' | 'subscription';
  oneTimePaymentAmount?: number;
  customAmount?: number;
  billingPeriod?: 'monthly' | 'yearly';
  message?: string;
  emailDelivery?: boolean;
  isPublic?: boolean; // whether sponsor name is shown publicly
  isMessagePublic?: boolean; // whether message is shown publicly
}

export interface SponsorshipCheckoutResponse {
  clientSecret: string;
  paymentMethodId: string;
}

export interface SponsorshipFull {
  id: string;
  status: 'ACTIVE' | 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'EXPIRED';
  type: 'ONE_TIME_PAYMENT' | 'SUBSCRIPTION';
  amount: number;
  currency: string;
  message?: string;
  emailDeliveryEnabled: boolean;
  isPublic?: boolean;
  isMessagePublic?: boolean;
  createdAt?: string;
  expiry?: string;
  sponsor?: {
    username: string;
    name?: string;
    picture?: string;
  };
  sponsoredExplorer?: {
    username: string;
    name?: string;
    picture?: string;
  };
  tier?: {
    id: string;
    description: string;
    price: number;
  };
}

export interface SponsorshipsFullResponse {
  results: number;
  data: SponsorshipFull[];
}

export type SponsorshipTierType = 'ONE_TIME' | 'MONTHLY';

export interface SponsorshipTierFull {
  id: string;
  type: SponsorshipTierType;
  price: number;
  description: string;
  isAvailable: boolean;
  membersCount?: number;
  priority?: number;
  creator?: {
    username: string;
    name?: string;
    picture?: string;
    bio?: string;
  };
}

export interface SponsorshipTiersFullResponse {
  results: number;
  data: SponsorshipTierFull[];
}

export interface SponsorshipTierCreatePayload {
  type: SponsorshipTierType;
  price: number;
  description?: string; // Optional - labels are fixed based on tier slot
  isAvailable?: boolean;
  priority?: number;
}

export interface SponsorshipTierUpdatePayload {
  price?: number;
  description?: string;
  isAvailable?: boolean;
  priority?: number;
}

export const sponsorshipApi = {
  /**
   * Get sponsorship tiers for a specific explorer (by username)
   */
  getExplorerTiers: (username: string) =>
    api.get<SponsorshipTiersFullResponse>(`/users/${username}/sponsorship-tiers`),

  /**
   * Start sponsorship checkout (one-time or subscription)
   */
  checkout: (payload: SponsorshipCheckoutPayload) =>
    api.post<SponsorshipCheckoutResponse>('/sponsor/checkout', payload),

  /**
   * Complete checkout after payment succeeds (fallback for webhook)
   */
  completeCheckout: (paymentIntentId: string) =>
    api.post<{ success: boolean }>('/sponsor/checkout/complete', { paymentIntentId }),

  /**
   * Get sponsorships sent BY the current user
   */
  getMySponsorships: async (): Promise<SponsorshipsFullResponse> => {
    const res = await api.get<{ results: number; data: any[] }>('/sponsorships/given');
    return {
      results: res.results,
      data: (res.data || []).map((s: any) => ({
        ...s,
        emailDeliveryEnabled: s.email_delivery_enabled ?? s.emailDeliveryEnabled ?? true,
        sponsoredExplorer: s.creator || s.sponsoredExplorer,
      })),
    };
  },

  /**
   * Get sponsorships RECEIVED by the current user (creator only)
   */
  getReceivedSponsorships: () =>
    api.get<SponsorshipsFullResponse>('/sponsorships'),

  /**
   * Get payments directly from Stripe (source of truth for revenue)
   */
  getStripePayments: () =>
    api.get<{
      results: number;
      data: Array<{
        id: string;
        amount: number;
        currency: string;
        status: string;
        refunded: boolean;
        created: string;
        sponsorEmail?: string;
        sponsorName?: string;
        sponsorUsername?: string;
        description?: string;
      }>;
    }>('/sponsorships/stripe-payments'),

  /**
   * Issue a refund for a payment (creator only)
   */
  issueRefund: (chargeId: string, reason?: string) =>
    api.post<{ success: boolean; refundId: string }>('/sponsorships/refund', {
      chargeId,
      reason,
    }),

  /**
   * Cancel a sponsorship subscription
   */
  cancelSponsorship: (sponsorshipId: string) =>
    api.post<{ success: boolean }>(`/sponsorships/${sponsorshipId}/cancel`),

  /**
   * Toggle email delivery for a sponsorship subscription
   */
  toggleEmailDelivery: (sponsorshipId: string, enabled: boolean) =>
    api.patch<{ success: boolean }>(`/sponsorships/${sponsorshipId}/email-delivery`, { enabled }),

  // ===== TIER MANAGEMENT (Explorer Pro) =====

  /**
   * Get current user's sponsorship tiers (for editing)
   */
  getMyTiers: () =>
    api.get<SponsorshipTiersFullResponse>('/sponsorship-tiers'),

  /**
   * Create a new sponsorship tier (max 3)
   */
  createTier: (payload: SponsorshipTierCreatePayload) =>
    api.post<{ id: string }>('/sponsorship-tiers', payload),

  /**
   * Update a sponsorship tier
   */
  updateTier: (tierId: string, payload: SponsorshipTierUpdatePayload) =>
    api.put<void>(`/sponsorship-tiers/${tierId}`, payload),

  /**
   * Delete a sponsorship tier (soft delete)
   */
  deleteTier: (tierId: string) =>
    api.delete<void>(`/sponsorship-tiers/${tierId}`),
};

// ============================================
// PAYOUT API
// ============================================

export interface CreatePayoutMethodPayload {
  country: string;
}

export interface CreatePayoutMethodResponse {
  payoutMethodId: string;
}

export interface StripeOnboardingLinkPayload {
  payoutMethodId: string;
  backUrl: string;
}

export interface StripeOnboardingLinkResponse {
  url: string;
}

export interface CreatePayoutPayload {
  amount: number;
}

export interface CreatePayoutResponse {
  payoutId: string;
}

export const payoutApi = {
  /**
   * Get creator balance (available + pending)
   */
  getBalance: () =>
    api.get<BalanceResponse>('/balance'),

  /**
   * Get all payout methods
   */
  getPayoutMethods: () =>
    api.get<PayoutMethodsResponse>('/payout-methods'),

  /**
   * Create a new payout method (Stripe Connect account)
   */
  createPayoutMethod: (payload: CreatePayoutMethodPayload) =>
    api.post<CreatePayoutMethodResponse>('/payout-methods', payload),

  /**
   * Get Stripe Connect onboarding link
   */
  getOnboardingLink: (payload: StripeOnboardingLinkPayload) =>
    api.post<StripeOnboardingLinkResponse>('/payout-methods/link', payload),

  /**
   * Get payout history
   */
  getPayouts: () =>
    api.get<PayoutsResponse>('/payouts'),

  /**
   * Request a manual payout
   */
  createPayout: (payload: CreatePayoutPayload) =>
    api.post<CreatePayoutResponse>('/payouts', payload),
};

// ============================================
// ADMIN API
// ============================================

export interface AdminStats {
  explorers: number;
  entries: number;
  expeditions: number;
  pendingFlags: number;
  blockedExplorers: number;
}

export interface AdminEntryListItem {
  id: string;
  title: string;
  author: {
    username: string;
    picture?: string;
  };
  createdAt: string;
  deletedAt?: string;
}

export interface AdminExpeditionListItem {
  id: string;
  title: string;
  status?: string;
  author: {
    username: string;
    picture?: string;
  };
  createdAt: string;
  deletedAt?: string;
}

export interface AdminExplorerListItem {
  username: string;
  email: string;
  role: string;
  blocked: boolean;
  createdAt: string;
  picture?: string;
}

export interface AdminFlag {
  id: string;
  category: string;
  description?: string;
  status: string;
  actionTaken?: string;
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  reporter: {
    username: string;
    picture?: string;
  };
  reviewedBy?: {
    username: string;
  };
  flaggedContent: {
    type: 'post' | 'comment';
    id: string;
    preview: string;
    author: {
      username: string;
      picture?: string;
    };
  };
}

export const adminApi = {
  getStats: () =>
    api.get<AdminStats>('/admin/stats'),

  getFlags: (params?: { status?: string; limit?: number; offset?: number }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return api.get<{ flags: AdminFlag[]; total: number }>(`/flags${qs}`);
  },

  updateFlag: (flagId: string, payload: { status: string; actionTaken?: string; adminNotes?: string }) =>
    api.put<{ success: boolean }>(`/flags/${flagId}`, payload),

  getEntries: (params?: { search?: string; limit?: number; offset?: number }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return api.get<{ data: AdminEntryListItem[]; total: number }>(`/admin/entries${qs}`);
  },

  deleteEntry: (id: string) =>
    api.delete<void>(`/admin/entries/${id}`),

  getExpeditions: (params?: { search?: string; limit?: number; offset?: number }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return api.get<{ data: AdminExpeditionListItem[]; total: number }>(`/admin/expeditions${qs}`);
  },

  deleteExpedition: (id: string) =>
    api.delete<void>(`/admin/expeditions/${id}`),

  getExplorers: (params?: { search?: string; limit?: number; offset?: number; blocked?: boolean }) => {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return api.get<{ data: AdminExplorerListItem[]; total: number }>(`/admin/explorers${qs}`);
  },

  blockExplorer: (username: string) =>
    api.post<void>(`/admin/explorers/${username}/block`),

  unblockExplorer: (username: string) =>
    api.post<void>(`/admin/explorers/${username}/unblock`),
};

export default api;
