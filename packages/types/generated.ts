// api
import {
  CheckoutMode,
  CheckoutStatus,
  MapQueryFilter,
  PlanExpiryPeriod,
  SponsorshipType,
} from './enums';

// general
export type GeoJson<T = any> = {
  type: string;
  features: {
    type: string;
    properties: T;
    geometry: {
      type: string;
      coordinates: [number, number, number];
    };
  }[];
};

// app
export interface ISitemapGetResponse {
  sources: {
    loc: string;
    lastmod: Date;
    changefreq: 'daily' | 'monthly' | 'yearly';
    priority: number;
  }[];
}

// session
export interface ISessionUser {
  role: string;
  username: string;
  email: string;
  picture?: string;
  name: string;
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
  name: string;
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
  name: string;
  picture: string;
  bio?: string;
  memberDate?: Date;
  followed?: boolean;
  you?: boolean;
  creator?: boolean;
}

export interface IUserSettingsResponse {
  context: 'profile' | 'billing';
  profile?: {
    name: string;
    bio: string;
    picture: string;
  };
}

export interface IUserSettingsUpdateQuery {
  context: 'profile' | 'billing';
  profile?: {
    name?: string;
    bio?: string;
    picture?: string;
  };
}

export interface IUserSettingsProfileResponse {
  username: string;
  email: string;
  name: string;
  bio: string;
  picture: string;
}

export interface IUserSettingsProfileUpdateQuery {
  name?: string;
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

// subscription
export interface ISubscriptionPlanDetail {
  slug: string;
  name: string;
  active: boolean;
  expiry?: Date;
  priceMonthly: number;
  priceYearly: number;
  discountYearly: number;
  currency: string;
  currencySymbol: string;
}

export interface ISubscriptionPlanGetAllResponse {
  data: ISubscriptionPlanDetail[];
}

export interface ISubscriptionPlanGetBySlugResponse
  extends ISubscriptionPlanDetail {}

export interface ISubscriptionPlanUpgradeCheckoutPayload {
  planId: string;
  period: PlanExpiryPeriod;
}

export interface ISubscriptionPlanUpgradeCheckoutResponse {
  subscriptionPlanId: number;
  subscriptionId: string;
  clientSecret: string;
}

export interface ISubscriptionPlanUpgradeCompletePayload {
  checkoutId: number;
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

// map
export interface IMapQueryPayload {
  location?: IMapQueryLocation;
  limit?: number;
  filter?: MapQueryFilter;
  page?: number;
  userId?: number;
}

export interface IMapQueryResponse {
  results: number;
  waypoints: {
    lat: number;
    lon: number;
    date: Date;
    post?: {
      id: string;
      title: string;
      content: string;
      author: {
        username: string;
        name: string;
        picture: string;
      };
    };
  }[];
}

export interface IMapQueryLocation {
  bounds?: IMapQueryLocationBounds;
}

export interface IMapQueryLocationBounds {
  ne: IMapQueryLocationBound;
  sw: IMapQueryLocationBound;
}

export interface IMapQueryLocationBound {
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
  aspect?: 'auto' | 'square';
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

// map
export interface IUserMapGetResponse {
  lastWaypoint: { lat: number; lon: number };
  geojson: GeoJson<{ id: string; title: string }>;
}

// sponsorship
export interface ISponsorshipTier {
  id: string;
  price: number;
  description: string;
  isAvailable?: boolean;
  membersCount?: number;
  creator?: {
    username: string;
    picture: string;
    name: string;
    bio: string;
  };
}

export interface ISponsorshipTierGetAllResponse {
  results: number;
  data: ISponsorshipTier[];
}

export interface ISponsorshipTierGetByUsernameResponse {
  sponsorship: ISponsorshipTier;
}

export interface ISponsorshipTierGetByIdResponse extends ISponsorshipTier {}

export interface ISponsorshipTierUpdatePayload {
  price?: number;
  description?: string;
  isAvailable?: boolean;
}

// payout
export interface IPayoutMethodBaseDetail {
  id: string;
  platform: string;
  isVerified: boolean;
  businessName: string;
  businessType: string;
  phoneNumber?: string;
  email: string;
  stripeAccountId?: string;
}

export interface IPayoutMethodGetAllByUsernameResponse {
  data: IPayoutMethodBaseDetail[];
  results: number;
}

export interface IPayoutMethodPlatformLinkGetResponse {
  url: string;
}

export interface IPayoutMethodCreatePayload {
  country: string;
  platform: string;
}

export interface IPayoutMethodCreateResponse {
  payoutMethodId: string;
  platform: {
    onboardingUrl: string;
  };
}

export interface IPayoutBalanceGetResponse {
  pending: {
    amount: number;
    currency: string;
  };
  available: {
    amount: number;
    currency: string;
  };
}

// sponsor
export interface ISponsorCheckoutPayload {
  creatorId: string;
  sponsorshipType: string;
  paymentMethodId: string;
  sponsorshipTierId?: string;
  oneTimePaymentAmount?: number;
}

export interface ISponsorCheckoutResponse {
  paymentMethodId: string;
  clientSecret: string;
}

export interface ISponsorshipDetail {
  id: string;
  type: SponsorshipType;
  amount: number;
  currency: string;
  user?: {
    username: string;
    name: string;
    picture: string;
  };
  creator?: {
    username: string;
    name: string;
    picture: string;
  };
  createdAt?: Date;
}

export interface ISponsorshipGetAllResponse {
  results: number;
  data: ISponsorshipDetail[];
}

// insights
export interface IPostInsightsGetResponse {
  posts: {
    id: string;
    title: string;
    impressionsCount: number;
    likesCount: number;
    bookmarksCount: number;
    createdAt: Date;
  }[];
}

// trips
export interface ITripDetail {
  id: string;
  title: string;
  description?: string;
  waypoints: IWaypointDetail[];
}

export interface ITripGetAllResponse {
  results: number;
  data: {
    id: string;
    title: string;
    waypointsCount: number;
  }[];
}

export interface ITripGetByIdResponse extends ITripDetail {}

export interface ITripCreatePayload {
  title: string;
}

export interface ITripCreateResponse {
  tripId: string;
}

export interface ITripUpdatePayload {
  title: string;
}

// waypoints
export interface IWaypointDetail {
  id: number;
  lat: number;
  lon: number;
  title: string;
  date?: Date;
  description?: string;
}

export interface IWaypointCreatePayload {
  lat: number;
  lon: number;
  date?: Date;
  title?: string;
  description?: string;
}

export interface IWaypointUpdatePayload {
  lat?: number;
  lon?: number;
  date?: Date;
  title?: string;
  description?: string;
}
