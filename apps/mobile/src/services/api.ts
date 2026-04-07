import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from './tokenStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.heimursaga.com/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public override message: string,
    public code?: string,
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
      errorMessage = response.statusText || errorMessage;
    }

    throw new ApiError(response.status, errorMessage, errorCode);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text);
}

// Track whether a token refresh is in flight to avoid concurrent refreshes
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refresh = await getRefreshToken();
      if (!refresh) return false;

      const refreshController = new AbortController();
      const refreshTimeout = setTimeout(() => refreshController.abort(), 10000);
      const res = await fetch(`${API_BASE_URL}/auth/mobile/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
        signal: refreshController.signal,
      });
      clearTimeout(refreshTimeout);

      if (!res.ok) {
        // Only clear tokens on auth failures, not server errors
        if (res.status < 500) await clearTokens();
        return false;
      }

      const data = await res.json();
      const newAccessToken = data.data.token;
      if (!newAccessToken) return false;
      // Server only returns a new access token; keep the existing refresh token
      await setAccessToken(newAccessToken);
      return true;
    } catch {
      // Network error (offline, timeout) — don't clear tokens
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Skip auth header (for login/refresh endpoints) */
  noAuth?: boolean;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, noAuth, headers: customHeaders, ...restOptions } = options;

  const headers: Record<string, string> = {};

  if (customHeaders) {
    if (customHeaders instanceof Headers) {
      customHeaders.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (!Array.isArray(customHeaders)) {
      Object.assign(headers, customHeaders);
    }
  }

  // Attach Bearer token unless explicitly skipped
  if (!noAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  if (body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...restOptions,
    headers,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  };

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let response: Response;
  try {
    response = await fetch(url, { ...config, signal: controller.signal });
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out — is the server running?');
    }
    throw new ApiError(0, 'Network error — could not reach server');
  }
  clearTimeout(timeout);

  // Auto-refresh on 401 then retry once
  if (response.status === 401 && !noAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = await getAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
      }
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 15000);
      try {
        response = await fetch(url, { ...config, headers, signal: retryController.signal });
      } catch {
        clearTimeout(retryTimeout);
        throw new ApiError(0, 'Network error — could not reach server');
      }
      clearTimeout(retryTimeout);
    }
  }

  return handleResponse<T>(response);
}

// ─── Convenience Methods ───

export const api = {
  get<T>(endpoint: string, opts?: RequestOptions) {
    return request<T>(endpoint, { ...opts, method: 'GET' });
  },
  post<T>(endpoint: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(endpoint, { ...opts, method: 'POST', body: body ?? {} });
  },
  put<T>(endpoint: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(endpoint, { ...opts, method: 'PUT', body: body ?? {} });
  },
  patch<T>(endpoint: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(endpoint, { ...opts, method: 'PATCH', body: body ?? {} });
  },
  delete<T>(endpoint: string, opts?: RequestOptions) {
    return request<T>(endpoint, { ...opts, method: 'DELETE' });
  },
};

export { API_BASE_URL };

// ─── Domain-Specific API Functions ───

import type {
  ApiResponse,
  Expedition,
  Entry,
  ExplorerProfile,
  Comment,
  Notification,
  Conversation,
  Message,
  SearchResults,
  BookmarksResponse,
  Sponsorship,
  SponsorshipTier,
  SponsorshipCheckout,
  PrepareCheckoutResponse,
  Balance,
  Payout,
  ProfileSettings,
} from '@/types/api';

export const authApi = {
  resetPassword(email: string) {
    return api.post<ApiResponse<void>>('/auth/reset-password', { email }, { noAuth: true });
  },
};

export const searchApi = {
  search(query: string, type?: string) {
    return api.post<ApiResponse<SearchResults>>('/search', { query, type });
  },
};

export const notificationsApi = {
  getNotifications() {
    return api.get<ApiResponse<Notification[]>>('/auth/mobile/notifications');
  },
  markAllRead() {
    return api.post<ApiResponse<void>>('/auth/mobile/notifications/mark-read');
  },
  getBadgeCount() {
    return api.get<ApiResponse<{ count: number }>>('/auth/mobile/badge-count');
  },
  registerPushToken(token: string, platform: string) {
    return api.post<{ success: boolean }>('/auth/mobile/push-token', { token, platform });
  },
  removePushToken(token: string) {
    return api.post<{ success: boolean }>('/auth/mobile/push-token/remove', { token });
  },
};

export const messagesApi = {
  getConversations() {
    return api.get<ApiResponse<Conversation[]>>('/messages/conversations');
  },
  getConversation(username: string) {
    return api.get<ApiResponse<Message[]>>(`/messages/conversations/${username}`);
  },
  send(recipientUsername: string, content: string) {
    return api.post<ApiResponse<Message>>('/messages/send', { recipientUsername, content });
  },
  markRead(messageId: string) {
    return api.patch<ApiResponse<void>>(`/messages/mark-read/${messageId}`);
  },
  getUnreadCount() {
    return api.get<ApiResponse<{ count: number }>>('/messages/unread-count');
  },
};

export const bookmarksApi = {
  getBookmarks() {
    return api.get<ApiResponse<BookmarksResponse>>('/auth/mobile/bookmarks');
  },
  getExpeditions() {
    return api.get<ApiResponse<Expedition[]>>('/user/bookmarks/expeditions');
  },
  getEntries() {
    return api.get<ApiResponse<Entry[]>>('/user/bookmarks');
  },
  getExplorers() {
    return api.get<ApiResponse<ExplorerProfile[]>>('/user/bookmarks/explorers');
  },
  toggleExpedition(tripId: string) {
    return api.post<ApiResponse<void>>(`/trips/${tripId}/bookmark`);
  },
  toggleEntry(postId: string) {
    return api.post<ApiResponse<void>>(`/posts/${postId}/bookmark`);
  },
  toggleExplorer(username: string) {
    return api.post<ApiResponse<void>>(`/users/${username}/bookmark`);
  },
};

export const explorerApi = {
  getProfile(username: string) {
    return api.get<ApiResponse<ExplorerProfile>>(`/users/${username}`);
  },
  getTrips(username: string) {
    return api.get<ApiResponse<Expedition[]>>(`/users/${username}/trips`);
  },
  getPosts(username: string) {
    return api.get<ApiResponse<Entry[]>>(`/users/${username}/posts`);
  },
  getFollowers(username: string) {
    return api.get<ApiResponse<ExplorerProfile[]>>(`/users/${username}/followers`);
  },
  getFollowing(username: string) {
    return api.get<ApiResponse<ExplorerProfile[]>>(`/users/${username}/following`);
  },
  follow(username: string) {
    return api.post<ApiResponse<void>>(`/users/${username}/follow`);
  },
  unfollow(username: string) {
    return api.post<ApiResponse<void>>(`/users/${username}/unfollow`);
  },
  getTiers(username: string) {
    return api.get<ApiResponse<SponsorshipTier[]>>(`/users/${username}/sponsorship-tiers`);
  },
};

export const commentsApi = {
  getComments(postId: string | number) {
    return api.get<ApiResponse<Comment[]>>(`/posts/${postId}/comments`);
  },
  createComment(postId: string | number, content: string, parentId?: string) {
    return api.post<ApiResponse<Comment>>(`/posts/${postId}/comments`, { content, parentId });
  },
  updateComment(commentId: string, content: string) {
    return api.put<ApiResponse<Comment>>(`/comments/${commentId}`, { content });
  },
  deleteComment(commentId: string) {
    return api.delete<ApiResponse<void>>(`/comments/${commentId}`);
  },
};

export const entryApi = {
  getEntries(params?: string) {
    return api.get<ApiResponse<Entry[]>>(`/posts${params ? `?${params}` : ''}`);
  },
  getEntry(id: number) {
    return api.get<ApiResponse<Entry>>(`/posts/${id}`);
  },
  createEntry(data: Record<string, unknown>) {
    return api.post<ApiResponse<Entry>>('/posts', data);
  },
  updateEntry(id: string | number, data: Partial<Entry>) {
    return api.put<ApiResponse<Entry>>(`/posts/${id}`, data);
  },
  deleteEntry(id: number) {
    return api.delete<ApiResponse<void>>(`/posts/${id}`);
  },
  getDrafts() {
    return api.get<ApiResponse<Entry[]>>('/posts/drafts');
  },
};

export const expeditionApi = {
  getExpeditions(params?: string) {
    return api.get<ApiResponse<Expedition[]>>(`/trips${params ? `?${params}` : ''}`);
  },
  getExpedition(id: string | number) {
    return api.get<ApiResponse<Expedition>>(`/trips/${id}`);
  },
  createExpedition(data: Record<string, unknown>) {
    return api.post<ApiResponse<Expedition>>('/trips', data);
  },
  updateExpedition(id: string | number, data: Partial<Expedition>) {
    return api.put<ApiResponse<Expedition>>(`/trips/${id}`, data);
  },
  deleteExpedition(id: string | number) {
    return api.delete<ApiResponse<void>>(`/trips/${id}`);
  },
  createWaypoint(expeditionId: string | number, data: { title?: string; lat: number; lon: number; date?: string; sequence?: number }) {
    return api.post<{ waypointId: number }>(`/trips/${expeditionId}/waypoints`, data);
  },
  deleteWaypoint(tripId: number, waypointId: number) {
    return api.delete<ApiResponse<void>>(`/trips/${tripId}/waypoints/${waypointId}`);
  },
  syncWaypoints(expeditionId: string | number, waypoints: Array<{ lat: number; lon: number; title?: string; sequence: number }>) {
    return api.put<void>(`/trips/${expeditionId}/waypoints/sync`, { waypoints });
  },
  getUserExpeditions() {
    return api.get<ApiResponse<Expedition[]>>('/user/trips');
  },
};

export const sponsorshipApi = {
  checkout(data: {
    sponsorshipType: string;
    creatorId: string;
    sponsorshipTierId: string;
    paymentMethodId?: string;
    stripePaymentMethodId?: string;
    oneTimePaymentAmount?: number;
    customAmount?: number;
    billingPeriod?: string;
    message?: string;
    isPublic?: boolean;
    isMessagePublic?: boolean;
    expeditionId?: string;
  }) {
    return api.post<SponsorshipCheckout>('/sponsor/checkout', data);
  },
  prepareCheckout(data: {
    sponsorshipType: string;
    creatorId: string;
    sponsorshipTierId: string;
    oneTimePaymentAmount?: number;
    customAmount?: number;
    billingPeriod?: string;
    message?: string;
    isPublic?: boolean;
    isMessagePublic?: boolean;
    expeditionId?: string;
  }) {
    return api.post<PrepareCheckoutResponse>('/sponsor/checkout/prepare', data);
  },
  completeCheckout(paymentIntentId: string) {
    return api.post<{ success: boolean }>('/sponsor/checkout/complete', { paymentIntentId });
  },
  getReceived() {
    return api.get<ApiResponse<Sponsorship[]>>('/sponsorships');
  },
  getGiven() {
    return api.get<ApiResponse<Sponsorship[]>>('/sponsorships/given');
  },
  cancel(id: number) {
    return api.post<ApiResponse<void>>(`/sponsorships/${id}/cancel`);
  },
  getTiers() {
    return api.get<ApiResponse<SponsorshipTier[]>>('/sponsorship-tiers');
  },
  createTier(data: Partial<SponsorshipTier>) {
    return api.post<ApiResponse<SponsorshipTier>>('/sponsorship-tiers', data);
  },
  updateTier(id: number, data: Partial<SponsorshipTier>) {
    return api.put<ApiResponse<SponsorshipTier>>(`/sponsorship-tiers/${id}`, data);
  },
  deleteTier(id: number) {
    return api.delete<ApiResponse<void>>(`/sponsorship-tiers/${id}`);
  },
  quickSponsor(entryPublicId: string) {
    return api.post<{ success?: boolean; sponsorshipId?: string; requiresPaymentMethod?: boolean; clientSecret?: string }>('/sponsor/quick', { entryPublicId });
  },
  confirmQuickSponsor(setupIntentId: string, entryPublicId: string) {
    return api.post<{ success: boolean; sponsorshipId: string }>('/sponsor/quick/confirm', { setupIntentId, entryPublicId });
  },
};

export interface PaymentMethodInfo {
  id: string;
  label: string;
  last4: string;
  isDefault?: boolean;
}

export const paymentMethodApi = {
  getAll() {
    return api.get<{ results: number; data: PaymentMethodInfo[] }>('/payment-methods');
  },
  createSetupIntent() {
    return api.post<{ clientSecret: string }>('/payment-methods/setup-intent');
  },
  create(stripePaymentMethodId: string) {
    return api.post<{ id: string }>('/payment-methods', { stripePaymentMethodId });
  },
  setDefault(paymentMethodId: string) {
    return api.post<{ success: boolean }>(`/payment-methods/${paymentMethodId}/default`);
  },
  remove(paymentMethodId: string) {
    return api.delete<{ success: boolean }>(`/payment-methods/${paymentMethodId}`);
  },
};

export const payoutApi = {
  getBalance() {
    return api.get<ApiResponse<Balance>>('/balance');
  },
  getPayouts() {
    return api.get<ApiResponse<Payout[]>>('/payouts');
  },
  requestPayout() {
    return api.post<ApiResponse<Payout>>('/payouts');
  },
};

export const settingsApi = {
  getProfile() {
    return api.get<ApiResponse<ProfileSettings>>('/user/settings/profile');
  },
  updateProfile(data: Partial<ProfileSettings>) {
    return api.put<ApiResponse<ProfileSettings>>('/user/settings/profile', data);
  },
};

export interface UploadResult {
  uploadId: string;
  original: string;
  thumbnail: string;
}

// Routing
export interface TrailRouteResponse {
  coordinates: [number, number][];
  legDistances: number[];
  legDurations: number[];
  totalDistance: number;
  totalDuration: number;
  snapDistances: number[];
  flowDirection?: 'downstream' | 'upstream' | 'mixed';
  upstreamFraction?: number;
  obstacles?: RouteObstacle[];
}

export interface RouteObstacle {
  lat: number;
  lon: number;
  type: 'dam' | 'weir' | 'waterfall' | 'lock_gate' | 'sluice_gate' | 'rapids';
  name: string | null;
}

export const routingApi = {
  trail(locations: Array<{ lat: number; lon: number }>, options?: { signal?: AbortSignal }) {
    return api.post<TrailRouteResponse>('/routing/trail', { locations }, options);
  },
  waterway(locations: Array<{ lat: number; lon: number }>, profile: 'canoe' | 'motorboat', options?: { signal?: AbortSignal }) {
    return api.post<TrailRouteResponse>('/routing/waterway', { locations, profile }, options);
  },
};

export const uploadApi = {
  async upload(uri: string, type: string = 'image/jpeg'): Promise<UploadResult> {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';
    formData.append('file', { uri, name: filename, type } as unknown as Blob);

    const token = await getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for uploads
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        signal: controller.signal,
      });
      return handleResponse<UploadResult>(res);
    } finally {
      clearTimeout(timeout);
    }
  },
};
