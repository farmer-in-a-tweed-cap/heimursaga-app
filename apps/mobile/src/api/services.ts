import {
  ILoginPayload,
  ISignupPayload,
  ISessionUserGetResponse,
  IPasswordResetPayload,
  IPasswordUpdatePayload,
  IPostCreatePayload,
  IPostCreateResponse,
  IPostGetByIdResponse,
  IPostQueryResponse,
  IPostUpdatePayload,
  IMapQueryPayload,
  IMapQueryResponse,
  IUserDetail,
  IUserPostsQueryResponse,
  IUserSettingsProfileGetResponse,
  IUserSettingsProfileUpdatePayload,
  IWaypointCreatePayload,
  IWaypointCreateResponse,
  IWaypointUpdatePayload,
  ITripCreatePayload,
  ITripCreateResponse,
  ITripGetAllResponse,
  ITripGetByIdResponse,
  ITripUpdatePayload,
  IMessageSendPayload,
  IMessagesGetResponse,
  IConversationsGetResponse,
  IMessageUnreadCountResponse,
  IMediaUploadResponse,
} from '@repo/types';
import { apiClient } from './client';
import { API_ROUTES } from './config';

// Authentication Services
export const authService = {
  async login(payload: ILoginPayload): Promise<void> {
    const response = await apiClient.post(API_ROUTES.LOGIN, payload);
    // The session token should be handled by cookies/headers in the backend
    return response;
  },

  async signup(payload: ISignupPayload): Promise<void> {
    return apiClient.post(API_ROUTES.SIGNUP, payload);
  },

  async logout(): Promise<void> {
    await apiClient.post(API_ROUTES.LOGOUT, {});
    await apiClient.clearAuth();
  },

  async getSession(): Promise<ISessionUserGetResponse> {
    return apiClient.get<ISessionUserGetResponse>(API_ROUTES.SESSION);
  },

  async resetPassword(payload: IPasswordResetPayload): Promise<void> {
    return apiClient.post(API_ROUTES.RESET_PASSWORD, payload);
  },

  async updatePassword(payload: IPasswordUpdatePayload): Promise<void> {
    return apiClient.post(API_ROUTES.CHANGE_PASSWORD, payload);
  },

  async verifyEmail(token: string): Promise<void> {
    return apiClient.post(API_ROUTES.VERIFY_EMAIL, { token });
  },
};

// Posts Services  
export const postsService = {
  async getPosts(): Promise<IPostQueryResponse> {
    return apiClient.get<IPostQueryResponse>(API_ROUTES.POSTS.GET);
  },

  async getPostById(id: string): Promise<IPostGetByIdResponse> {
    return apiClient.get<IPostGetByIdResponse>(API_ROUTES.POSTS.GET_BY_ID(id));
  },

  async createPost(payload: IPostCreatePayload): Promise<IPostCreateResponse> {
    return apiClient.post<IPostCreateResponse>(API_ROUTES.POSTS.CREATE, payload);
  },

  async updatePost(id: string, payload: IPostUpdatePayload): Promise<void> {
    return apiClient.put(API_ROUTES.POSTS.UPDATE(id), payload);
  },

  async deletePost(id: string): Promise<void> {
    return apiClient.delete(API_ROUTES.POSTS.DELETE(id));
  },

  async likePost(id: string): Promise<{ likesCount: number }> {
    return apiClient.post<{ likesCount: number }>(API_ROUTES.POSTS.LIKE(id), {});
  },

  async bookmarkPost(id: string): Promise<{ bookmarksCount: number }> {
    return apiClient.post<{ bookmarksCount: number }>(API_ROUTES.POSTS.BOOKMARK(id), {});
  },

  async getUserDrafts(): Promise<IPostQueryResponse> {
    return apiClient.get<IPostQueryResponse>(API_ROUTES.USER.DRAFTS);
  },
};

// Users Services
export const usersService = {
  async getUserByUsername(username: string): Promise<IUserDetail> {
    return apiClient.get<IUserDetail>(API_ROUTES.USERS.GET_BY_USERNAME(username));
  },

  async getUserPosts(): Promise<IUserPostsQueryResponse> {
    return apiClient.get<IUserPostsQueryResponse>(API_ROUTES.USER.POSTS);
  },

  async getUserPostsByUsername(username: string): Promise<IUserPostsQueryResponse> {
    return apiClient.get<IUserPostsQueryResponse>(API_ROUTES.USERS.POSTS(username));
  },

  async followUser(username: string): Promise<void> {
    return apiClient.post(API_ROUTES.USERS.FOLLOW(username), {});
  },

  async unfollowUser(username: string): Promise<void> {
    return apiClient.post(API_ROUTES.USERS.UNFOLLOW(username), {});
  },

  async getUserBookmarks(): Promise<IUserPostsQueryResponse> {
    return apiClient.get<IUserPostsQueryResponse>(API_ROUTES.USER.BOOKMARKS);
  },

  async getUserProfileSettings(): Promise<IUserSettingsProfileGetResponse> {
    return apiClient.get<IUserSettingsProfileGetResponse>(API_ROUTES.USER.SETTINGS.PROFILE);
  },

  async updateUserProfileSettings(payload: IUserSettingsProfileUpdatePayload): Promise<void> {
    return apiClient.put(API_ROUTES.USER.SETTINGS.PROFILE, payload);
  },

  async updateUserPicture(file: FormData): Promise<void> {
    return apiClient.upload(API_ROUTES.USER.UPDATE_PICTURE, file);
  },
};

// Map Services
export const mapService = {
  async queryMap(payload: IMapQueryPayload): Promise<IMapQueryResponse> {
    return apiClient.post<IMapQueryResponse>(API_ROUTES.MAP.QUERY, payload);
  },

  async createWaypoint(payload: IWaypointCreatePayload): Promise<IWaypointCreateResponse> {
    return apiClient.post<IWaypointCreateResponse>(API_ROUTES.MAP.WAYPOINTS.CREATE, payload);
  },

  async updateWaypoint(id: number, payload: IWaypointUpdatePayload): Promise<void> {
    return apiClient.put(API_ROUTES.MAP.WAYPOINTS.UPDATE(id), payload);
  },

  async deleteWaypoint(id: number): Promise<void> {
    return apiClient.delete(API_ROUTES.MAP.WAYPOINTS.DELETE(id));
  },
};

// Trips Services
export const tripsService = {
  async getTrips(): Promise<ITripGetAllResponse> {
    return apiClient.get<ITripGetAllResponse>(API_ROUTES.TRIPS.GET);
  },

  async getTripById(id: string): Promise<ITripGetByIdResponse> {
    return apiClient.get<ITripGetByIdResponse>(API_ROUTES.TRIPS.GET_BY_ID(id));
  },

  async createTrip(payload: ITripCreatePayload): Promise<ITripCreateResponse> {
    return apiClient.post<ITripCreateResponse>(API_ROUTES.TRIPS.CREATE, payload);
  },

  async updateTrip(id: string, payload: ITripUpdatePayload): Promise<void> {
    return apiClient.put(API_ROUTES.TRIPS.UPDATE(id), payload);
  },

  async deleteTrip(id: string): Promise<void> {
    return apiClient.delete(API_ROUTES.TRIPS.DELETE(id));
  },
};

// Upload Services
export const uploadService = {
  async uploadImage(file: FormData): Promise<IMediaUploadResponse> {
    return apiClient.upload<IMediaUploadResponse>(API_ROUTES.UPLOAD, file);
  },
};

// Search Services
export const searchService = {
  async search(query: string): Promise<{ users: any[]; entries: any[] }> {
    return apiClient.post<{ users: any[]; entries: any[] }>(API_ROUTES.SEARCH, { search: query });
  },
};

// Messages Services (for social features)
export const messagesService = {
  async getConversations(): Promise<IConversationsGetResponse> {
    return apiClient.get<IConversationsGetResponse>(API_ROUTES.MESSAGES.CONVERSATIONS);
  },

  async getConversation(username: string): Promise<IMessagesGetResponse> {
    return apiClient.get<IMessagesGetResponse>(API_ROUTES.MESSAGES.CONVERSATION(username));
  },

  async sendMessage(payload: IMessageSendPayload): Promise<void> {
    return apiClient.post(API_ROUTES.MESSAGES.SEND, payload);
  },

  async markMessageRead(messageId: string): Promise<void> {
    return apiClient.patch(API_ROUTES.MESSAGES.MARK_READ(messageId), {});
  },

  async getUnreadCount(): Promise<IMessageUnreadCountResponse> {
    return apiClient.get<IMessageUnreadCountResponse>(API_ROUTES.MESSAGES.UNREAD_COUNT);
  },
};

// Export all services
export const api = {
  auth: authService,
  posts: postsService,
  users: usersService,
  map: mapService,
  trips: tripsService,
  upload: uploadService,
  search: searchService,
  messages: messagesService,
};