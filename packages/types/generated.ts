// api
import { CheckoutMode, CheckoutStatus, PlanExpiryPeriod } from './enums';

// session
export interface ISessionUser {
  role: string;
  username: string;
  email: string;
  picture?: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
  isPremium: boolean;
}

export interface ISessionUserGetResponse extends ISessionUser {}

// login
export interface ILoginPayload {
  email: string;
  password: string;
}

export interface ILoginResponse {
  session: {
    sid: string;
    expiredAt: Date;
  };
}

// signup
export interface ISignupPayload {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

// password reset
export interface IPasswordResetPayload {
  email: string;
}

export interface IPasswordUpdatePayload {
  password: string;
  token: string;
}

// user
export interface IUserProfileDetail {
  username: string;
  picture: string;
  bio?: string;
  firstName: string;
  lastName: string;
  memberDate?: Date;
  followed?: boolean;
  you?: boolean;
}

export interface IUserSettingsResponse {
  context: 'profile' | 'billing';
  profile?: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    bio: string;
    picture: string;
  };
}

export interface IUserSettingsUpdateQuery {
  context: 'profile' | 'billing';
  profile?: {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    picture?: string;
  };
}

export interface IUserSettingsProfileResponse {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  bio: string;
  picture: string;
}

export interface IUserSettingsProfileUpdateQuery {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  picture?: string;
}

export interface IUserPostsQueryResponse {
  results: number;
  data: IPostDetailResponse[];
}

export interface IUserFollowersQueryResponse {
  results: number;
  data: IUserProfileDetail[];
}

export interface IUserFollowingQueryResponse {
  results: number;
  data: IUserProfileDetail[];
}

export interface IUserPictureUploadPayload {
  file: { buffer: Buffer };
}

export interface IUserPictureUploadClientPayload {
  file: File;
}

// payment method
export interface IPaymentMethodDetail {
  id: string;
  label: string;
  stripePaymentMethodId?: string;
  last4?: string;
}

export interface IPaymentMethodGetAllResponse {
  data: IPaymentMethodDetail[];
  results: number;
}

export interface IPaymentMethodGetByIdResponse extends IPaymentMethodDetail {}

export interface IPaymentMethodCreatePayload {
  stripePaymentMethodId: string;
}

export interface IPaymentIntentCreateResponse {
  secret: string;
}

export interface ICheckoutPayload {
  mode: CheckoutMode;
  membershipId?: string;
  donation?: number;
  creatorId?: string;
}

export interface ICheckoutResponse {
  checkoutId: string;
  status: CheckoutStatus;
  secret: string;
  requiresAction: boolean;
}

export interface IPlanUpgradeCheckoutPayload {
  planId: string;
  period: PlanExpiryPeriod;
}

export interface IPlanUpgradeCheckoutResponse {
  planId: string;
  period: PlanExpiryPeriod;
  checkout: {
    id: string;
    status: CheckoutStatus;
    amount: number;
    currency: string;
    secret: string;
    requiresAction: boolean;
  };
}

export interface IPlanUpgradeCompletePayload {
  checkoutId: string;
}

export interface IPlanDegradePayload {}

export interface IPlanDegradeResponse {}

// post
export interface IPostDetail {
  id: string;
  title: string;
  content?: string;
  lat: number;
  lon: number;
  public?: boolean;
  draft?: boolean;
  liked?: boolean;
  bookmarked?: boolean;
  likesCount?: number;
  bookmarksCount?: number;
  place?: string;
  date?: Date;
  createdByMe?: boolean;
  author?: {
    username: string;
    name: string;
    picture: string;
  };
}

export interface IPostQueryResponse {
  data: IPostDetailResponse[];
  results: number;
}

export interface IPostDetailResponse extends IPostDetail {}

export interface IPostCreatePayload {
  title: string;
  content: string;
  lat?: number;
  lon?: number;
  public?: boolean;
  draft?: boolean;
  place?: string;
  date?: Date;
}

export interface IPostCreateResponse {
  id: string;
}

export interface IPostUpdatePayload {
  title?: string;
  content?: string;
  lat?: number;
  lon?: number;
  public?: boolean;
  draft?: boolean;
  place?: string;
  date?: Date;
}

export interface IPostLikeResponse {
  likesCount: number;
}

export interface IPostBookmarkResponse {
  bookmarksCount: number;
}

export interface IPostQueryMapResponse {
  results: number;
  data: IPostDetailResponse[];
  geojson?: {
    type: 'FeatureCollection';
    features: {
      type: 'Feature';
      properties: Record<string, string | number | boolean>[];
      geometry: { type: 'Point'; coordinates: [number, number, number] };
    };
  };
}

// search
export interface ISearchQueryPayload {
  location?: ISearchQueryLocation;
  limit?: number;
  page?: number;
  userId?: number;
}

export interface ISearchQueryResponse {
  results: number;
  data: {
    id: string;
    title: string;
    content: string;
    date: Date;
    lat: number;
    lon: number;
  }[];
  geojson?: {
    type: string;
    features: {
      type: string;
      properties: Record<string, string | number | boolean | Date>;
      geometry: { type: string; coordinates: [number, number, number] };
    }[];
  };
}

export interface ISearchQueryLocation {
  bounds?: ISearchQueryLocationBounds;
}

export interface ISearchQueryLocationBounds {
  ne: ISearchQueryLocationBound;
  sw: ISearchQueryLocationBound;
}

export interface ISearchQueryLocationBound {
  lat: number;
  lon: number;
}

// upload
export enum MediaUploadContext {
  UPLOAD = 'upload',
  USER = 'user',
}

export interface IMediaUploadPayload {
  file: { buffer: Buffer };
  context: MediaUploadContext;
  thumbnail?: boolean;
}

export interface IMediaUploadQueryParams {
  thumbnail?: boolean;
}

export interface IMediaUploadResponse {
  thumbnail: string;
  original: string;
}

// stripe
export interface IStripeCreateSetupIntentResponse {
  secret: string;
}

// notifications

export interface IUserNotification {
  context: string;
  date: Date;
  mentionUser: {
    username: string;
    name: string;
    picture: string;
  };
  body?: string;
  postId?: string;
}

export interface IUserNotificationGetResponse {
  results: number;
  data: IUserNotification[];
  page: number;
}
