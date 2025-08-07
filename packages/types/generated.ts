// api
import {
  CheckoutMode,
  CheckoutStatus,
  MapQueryContext,
  PlanExpiryPeriod,
  SponsorshipType,
  SponsorshipBillingPeriod,
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

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
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
  // name: string;
  isEmailVerified: boolean;
  isPremium: boolean;
}

export interface ISessionUserGetResponse extends ISessionUser {}

// login
export interface ILoginPayload {
  login: string;
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
  recaptchaToken?: string;
  // name: string;
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
export interface IUserDetail {
  username: string;
  role?: string;
  // name: string;
  picture: string;
  bio?: string;
  memberDate?: Date;
  locationFrom?: string;
  locationLives?: string;
  sponsorsFund?: string;
  sponsorsFundType?: string;
  sponsorsFundJourneyId?: string;
  portfolio?: string;
  followed?: boolean;
  you?: boolean;
  creator?: boolean;

  postsCount?: number;
  blocked?: boolean;
}

export interface IUserGetAllResponse {
  data: IUserDetail[];
  results: number;
}

export interface IUserGetByUsernameResponse extends IUserDetail {
  sponsorsFund?: string;
}

export interface IUserSettingsResponse {
  context: 'profile' | 'billing';
  profile?: {
    // name: string;
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

export interface IUserSettingsProfileGetResponse {
  username: string;
  email: string;
  isEmailVerified?: boolean;
  // name: string;
  bio: string;
  picture: string;
  locationFrom?: string;
  locationLives?: string;
  sponsorsFund?: string;
  sponsorsFundType?: string;
  sponsorsFundJourneyId?: string;
  portfolio?: string;
}

export interface IUserSettingsProfileUpdatePayload {
  name?: string;
  bio?: string;
  picture?: string;
  from?: string;
  livesIn?: string;
  sponsorsFund?: string;
  sponsorsFundType?: string;
  sponsorsFundJourneyId?: string;
  portfolio?: string;
}

export interface IUserPostsQueryResponse {
  results: number;
  data: IPostDetail[];
}

export interface IUserFollowersQueryResponse {
  results: number;
  data: IUserDetail[];
}

export interface IUserFollowingQueryResponse {
  results: number;
  data: IUserDetail[];
}

export interface IUserPictureUploadPayload {
  file: UploadedFile;
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
  promoCode?: string;
}

export interface ISubscriptionPlanUpgradeCheckoutResponse {
  subscriptionPlanId: number;
  subscriptionId: string;
  clientSecret: string | null;
  isFreeSubscription?: boolean;
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
  waypoint?: {
    id: number;
    lat: number;
    lon: number;
  };
  media?: { id: string; thumbnail: string }[];
  public?: boolean;
  sponsored?: boolean;
  liked?: boolean;
  bookmarked?: boolean;
  likesCount?: number;
  bookmarksCount?: number;
  place?: string;
  date?: Date;
  createdByMe?: boolean;
  createdAt?: Date;
  trip?: {
    id: string;
    title: string;
  };
  author?: {
    username: string;
    // name: string;
    picture: string;
    creator?: boolean;
  };
}

export interface IPostGetAllResponse {
  data: IPostDetail[];
  results: number;
}

export interface IPostQueryResponse {
  data: IPostDetail[];
  results: number;
}

export interface IPostGetByIdResponse extends IPostDetail {}

export interface IPostCreatePayload {
  title: string;
  content: string;
  lat?: number;
  lon?: number;
  public?: boolean;
  sponsored?: boolean;
  place?: string;
  date?: Date;
  uploads?: string[];
  waypointId?: number;
  tripId?: string;
}

export interface IPostCreateResponse {
  id: string;
}

export interface IPostUpdatePayload {
  title?: string;
  content?: string;
  waypoint?: IWaypointUpdatePayload;
  public?: boolean;
  sponsored?: boolean;
  place?: string;
  date?: Date;
  uploads?: string[];
  tripId?: string;
}

export interface IPostLikeResponse {
  likesCount: number;
}

export interface IPostBookmarkResponse {
  bookmarksCount: number;
}

export interface IPostQueryMapResponse {
  results: number;
  data: IPostDetail[];
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
  context?: string;
  page?: number;
  search?: string;
  username?: string;
  tripId?: string;
  prioritizeEntryId?: string;
}

export interface IMapQueryResponse {
  results: number;
  waypoints: {
    lat: number;
    lon: number;
    date: Date;
    waypoint?: {
      id: number;
      title: string;
      date: Date;
    };
    post?: {
      id: string;
      title: string;
      content: string;
      date?: Date;
      bookmarked: boolean;
      author: {
        username: string;
        // name: string;
        picture: string;
        creator?: boolean;
      };
      trip?: {
        id: string;
        title: string;
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

export interface IWaypoint {
  id: number;
  lat: number;
  lon: number;
  title?: string;
  description?: string;
  date?: Date;
  public?: boolean;
  post?: { id: string; title: string };
}

export interface IWaypointDetail extends IWaypoint {
  post?: {
    id: string;
    title: string;
    content?: string;
    date?: Date;
    place?: string;
    sponsored?: boolean;
    author?: {
      username: string;
      name?: string;
      picture?: string;
    };
  };
}

export interface IWaypointCreatePayload {
  lat: number;
  lon: number;
  title?: string;
  date?: Date;
  postId?: string;
  tripId?: string;
}

export interface IWaypointCreateResponse {
  id: number;
}

export interface IWaypointUpdatePayload extends Partial<IWaypoint> {
  postId?: string;
  tripId?: string;
}

export interface IWaypointGetByIdResponse extends IWaypointDetail {}

export interface IWaypointUpdatePayload {
  lat?: number;
  lon?: number;
  date?: Date;
  title?: string;
  description?: string;
}

// upload
export enum MediaUploadContext {
  UPLOAD = 'upload',
  USER = 'user',
}

export interface IMediaUploadPayload {
  file: UploadedFile;
  context: MediaUploadContext;
  thumbnail?: boolean;
  aspect?: 'auto' | 'square';
}

export interface IMediaUploadQueryParams {
  thumbnail?: boolean;
}

export interface IMediaUploadResponse {
  uploadId: string;
  original: string;
  thumbnail: string;
}

// stripe
export interface IStripeCreateSetupIntentResponse {
  secret: string;
}

// notifications
export interface IUserNotification {
  context: string;
  date: Date;
  read?: boolean;
  mentionUser: {
    username: string;
    // name: string;
    picture: string;
  };
  body?: string;
  postId?: string;
  sponsorshipType?: string;
  sponsorshipAmount?: number;
  sponsorshipCurrency?: string;
}

export interface IUserNotificationGetResponse {
  results: number;
  data: IUserNotification[];
  page: number;
}

export interface IBadgeCount {
  notifications: number;
}

export interface IBadgeCountGetResponse extends IBadgeCount {}

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
  priority?: number;
  membersCount?: number;
  creator?: {
    username: string;
    picture: string;
    // name: string;
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
  priority?: number;
}

export interface ISponsorshipTierCreatePayload {
  price: number;
  description: string;
  isAvailable?: boolean;
  priority?: number;
}

export interface ISponsorshipTierWithPricing {
  id: string;
  price: number;
  description: string;
  isAvailable?: boolean;
  priority?: number;
  membersCount?: number;
  pricing: {
    monthly: number;
    yearly: number; // monthly * 12 * 0.9
  };
  creator?: {
    username: string;
    picture: string;
    bio: string;
  };
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
  currency?: string;
  country?: string;
  stripeAccountId?: string;
  automaticPayouts?: {
    enabled: boolean;
    schedule?: {
      interval: 'manual' | 'daily' | 'weekly' | 'monthly';
      delayDays?: number;
    };
  };
}

export interface IPayoutMethodGetResponse {
  data: IPayoutMethodBaseDetail[];
  results: number;
}

export interface IPayoutMethodPlatformLinkGetResponse {
  url: string;
}

export interface IPayoutMethodCreatePayload {
  country: string;
}

export interface IPayoutMethodCreateResponse {
  payoutMethodId: string;
}

export interface IPayoutBalanceGetResponse {
  pending: {
    amount: number;
    currency: string;
    symbol: string;
  };
  available: {
    amount: number;
    currency: string;
    symbol: string;
  };
}

// payouts
export interface IPayoutDetail {
  id: string;
  amount: number;
  status: string;
  currency: {
    code: string;
    symbol: string;
  };
  created: Date;
  arrival?: Date;
}

export interface IPayoutGetResponse {
  data: IPayoutDetail[];
  results: number;
}

export interface IPayoutCreatePayload {
  amount: number;
}

export enum StripePlayformAccountLinkMode {
  ONBOARDING = 'onboarding',
  UPDATE = 'update',
}
export interface IStripePlatformAccountLinkGeneratePayload {
  mode: StripePlayformAccountLinkMode;
  payoutMethodId: string;
  backUrl: string;
}

export interface IStripePlatformAccountLinkGenerateResponse {
  url: string;
}

export interface IPayoutCreateResponse {
  payoutId: string;
}

// sponsor
export interface ISponsorCheckoutPayload {
  creatorId: string;
  sponsorshipType: string;
  paymentMethodId: string;
  sponsorshipTierId?: string;
  billingPeriod?: SponsorshipBillingPeriod;
  oneTimePaymentAmount?: number;
  message?: string;
  emailDelivery?: boolean;
}

export interface ISponsorCheckoutResponse {
  paymentMethodId: string;
  clientSecret: string;
}

export interface ISponsorshipDetail {
  id: string;
  type: SponsorshipType;
  amount: number;
  status: string;
  currency: string;
  message?: string;
  email_delivery_enabled?: boolean;
  user?: {
    username: string;
    // name: string;
    picture: string;
  };
  creator?: {
    username: string;
    // name: string;
    picture: string;
  };
  tier?: {
    id: string;
    description: string;
    title: string;
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
  startDate: Date;
  endDate: Date;
  description?: string;
  public?: boolean;
  waypoints: IWaypointDetail[];
  waypointsCount?: number;
  author?: {
    username: string;
    // name: string;
    picture: string;
    creator?: boolean;
  };
}

export interface ITripGetAllResponse {
  results: number;
  data: ITripDetail[];
}

export interface ITripGetByIdResponse extends ITripDetail {}

export interface ITripCreatePayload {
  title: string;
  public?: boolean;
}

export interface ITripCreateResponse {
  tripId: string;
}

export interface ITripUpdatePayload {
  title: string;
  public?: boolean;
}

// search
export interface ISearchQueryPayload {
  search: string;
}
