// api
import {
  CheckoutMode,
  CheckoutStatus,
  FlagActionType,
  FlagCategory,
  FlagStatus,
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
  id: number;
  role: string;
  username: string;
  email: string;
  picture?: string;
  // name: string;
  isEmailVerified: boolean;
  isPremium: boolean;
  stripeAccountConnected?: boolean;
  createdAt?: Date;
}

export interface ISessionUserGetResponse extends ISessionUser {}

// login
export interface ILoginPayload {
  login: string;
  password: string;
  remember?: boolean;
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
  stripeAccountConnected?: boolean;

  postsCount?: number;
  blocked?: boolean;
}

export interface IUserGetAllResponse {
  data: IUserDetail[];
  results: number;
}

export interface IUserGetByUsernameResponse extends IUserDetail {
  sponsorsFund?: string;
  equipment?: string[];
  activeExpeditionOffGrid?: boolean;
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
  from?: string;
  livesIn?: string;
  locationFrom?: string;
  locationLives?: string;
  sponsorsFund?: string;
  sponsorsFundType?: string;
  sponsorsFundJourneyId?: string;
  portfolio?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  equipment?: string[];
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
  website?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  equipment?: string[];
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
  isDefault?: boolean;
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
  promo?: {
    hasActivePromo: boolean;
    isFreePeriod: boolean;
    percentOff?: number;
    amountOff?: number;
    duration?: string;
    durationInMonths?: number;
    promoEnd?: Date;
  } | null;
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

// post (entry) - entries are distinct from waypoints
export interface IPostDetail {
  id: string;
  title: string;
  content?: string;
  // Coordinates stored directly on entry
  lat?: number;
  lon?: number;
  countryCode?: string; // ISO 3166-1 alpha-2 country code from reverse geocoding
  media?: { id: string; thumbnail: string; original?: string; caption?: string; altText?: string; credit?: string }[];
  public?: boolean;
  sponsored?: boolean;
  isDraft?: boolean;
  liked?: boolean;
  bookmarked?: boolean;
  likesCount?: number;
  bookmarksCount?: number;
  commentsCount?: number;
  commentsEnabled?: boolean;
  place?: string;
  date?: Date;
  createdByMe?: boolean;
  followingAuthor?: boolean;
  createdAt?: Date;
  // New fields
  entryType?: 'standard' | 'photo-essay' | 'data-log' | 'waypoint';
  coverImage?: string;
  isMilestone?: boolean;
  visibility?: 'public' | 'off-grid' | 'sponsors-only' | 'private';
  author?: {
    username: string;
    name?: string;
    picture: string;
    creator?: boolean;
  };
  // Expedition relationship (direct foreign key on entry)
  trip?: {
    id: string;
    title: string;
    entriesCount?: number;
    visibility?: 'public' | 'off-grid' | 'private';
  };
  // Entry number within expedition (calculated on the fly)
  entryNumber?: number;
  // Day of the expedition when this entry was written (calculated from entry date - expedition start date)
  expeditionDay?: number;
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
  isDraft?: boolean;
  place?: string;
  date?: Date;
  uploads?: string[];
  uploadCaptions?: { [uploadId: string]: string };
  uploadAltTexts?: { [uploadId: string]: string };
  uploadCredits?: { [uploadId: string]: string };
  waypointId?: number;
  tripId?: string;
  expeditionId?: string;
  commentsEnabled?: boolean;
  // New fields
  entryType?: 'standard' | 'photo-essay' | 'data-log' | 'waypoint';
  coverUploadId?: string;
  isMilestone?: boolean;
  visibility?: 'public' | 'off-grid' | 'sponsors-only' | 'private';
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
  isDraft?: boolean;
  place?: string;
  date?: Date;
  uploads?: string[];
  uploadCaptions?: { [uploadId: string]: string };
  uploadAltTexts?: { [uploadId: string]: string };
  uploadCredits?: { [uploadId: string]: string };
  tripId?: string;
  expeditionId?: string;
  commentsEnabled?: boolean;
  // New fields
  entryType?: 'standard' | 'photo-essay' | 'data-log' | 'waypoint';
  coverUploadId?: string;
  isMilestone?: boolean;
  visibility?: 'public' | 'off-grid' | 'sponsors-only' | 'private';
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

// comment
export interface ICommentDetail {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    username: string;
    picture?: string;
    creator?: boolean;
  };
  createdByMe: boolean;
  parentId?: string;
  repliesCount?: number;
  replies?: ICommentDetail[];
}

export interface ICommentListResponse {
  data: ICommentDetail[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ICommentCreatePayload {
  content: string;
  parentId?: string;
}

export interface ICommentUpdatePayload {
  content: string;
}

export interface ICommentDeleteResponse {
  success: boolean;
}

export interface ICommentToggleResponse {
  commentsEnabled: boolean;
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
  sequence?: number;
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
  description?: string;
  date?: Date;
  sequence?: number;
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
  sequence?: number;
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
  mentionUser?: {
    username: string;
    name?: string;
    picture?: string;
  };
  body?: string;
  postId?: string;
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
  type: 'ONE_TIME' | 'MONTHLY';
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
  type: 'ONE_TIME' | 'MONTHLY';
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
  customAmount?: number;
  message?: string;
  emailDelivery?: boolean;
  isPublic?: boolean; // whether sponsor name is shown publicly
  isMessagePublic?: boolean; // whether message is shown publicly
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
  isPublic?: boolean;
  isMessagePublic?: boolean;
  user?: {
    username: string;
    name?: string;
    picture?: string;
  };
  creator?: {
    username: string;
    name?: string;
    picture?: string;
  };
  tier?: {
    id: string;
    description: string;
    title: string;
    price?: number;
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
    bookmarksCount: number;
    commentsCount: number;
    viewsCount: number;
    uniqueViewersCount: number;
    createdAt: Date;
  }[];
}

// trips
export interface ITripDetail {
  id: string;
  title: string;
  createdAt?: Date;
  startDate?: Date;
  endDate?: Date;
  description?: string;
  public?: boolean;
  visibility?: 'public' | 'off-grid' | 'private';
  status?: string;
  coverImage?: string;
  category?: string;
  region?: string;
  tags?: string[];
  isRoundTrip?: boolean;
  routeMode?: string;
  routeGeometry?: number[][];
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  currentLocationVisibility?: 'public' | 'sponsors' | 'private';
  goal?: number;
  raised?: number;
  sponsorsCount?: number;
  recurringStats?: {
    activeSponsors: number;
    monthlyRevenue: number;
    totalCommitted: number;
  };
  entriesCount?: number;
  waypoints: IWaypointDetail[];
  waypointsCount?: number;
  // Entries directly linked to this expedition via expedition_id
  entries?: {
    id: string;
    title: string;
    content?: string;
    date?: Date;
    place?: string;
    lat?: number;
    lon?: number;
    mediaCount?: number;
    author?: {
      username: string;
      name?: string;
      picture?: string;
    };
  }[];
  author?: {
    username: string;
    name?: string;
    picture?: string;
    creator?: boolean;
  };
  bookmarked?: boolean;
  followingAuthor?: boolean;
  sponsors?: {
    id: string;
    type: string;
    amount: number;
    status: string;
    message?: string;
    isPublic: boolean;
    isMessagePublic: boolean;
    createdAt?: Date;
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
  }[];
}

export interface ITripGetAllResponse {
  results: number;
  data: ITripDetail[];
}

export interface ITripGetByIdResponse extends ITripDetail {}

export interface ITripCreatePayload {
  title: string;
  description?: string;
  public?: boolean;
  visibility?: 'public' | 'off-grid' | 'private';
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  coverImage?: string;
  goal?: number;
  category?: string;
  region?: string;
  tags?: string[];
  isRoundTrip?: boolean;
  routeMode?: string;
  routeGeometry?: number[][];
}

export interface ITripCreateResponse {
  tripId: string;
}

export interface ITripUpdatePayload {
  title: string;
  description?: string;
  public?: boolean;
  visibility?: 'public' | 'off-grid' | 'private';
  status?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  coverImage?: string;
  goal?: number;
  category?: string;
  region?: string;
  tags?: string[];
  isRoundTrip?: boolean;
  routeMode?: string;
  routeGeometry?: number[][];
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  currentLocationVisibility?: 'public' | 'sponsors' | 'private';
}

// search
export interface ISearchQueryPayload {
  search: string;
}

// messaging
export interface IMessageSendPayload {
  content: string;
  recipientUsername: string;
}

export interface IMessageDetail {
  id: string;
  content: string;
  senderId: number;
  recipientId: number;
  isRead: boolean;
  createdAt: Date;
  sender: {
    username: string;
    name?: string;
    picture?: string;
  };
  recipient: {
    username: string;
    name?: string;
    picture?: string;
  };
}

export interface IConversationDetail {
  recipientUsername: string;
  recipientName?: string;
  recipientPicture?: string;
  lastMessage: {
    content: string;
    createdAt: Date;
    isFromMe: boolean;
  };
  unreadCount: number;
}

export interface IMessagesGetResponse {
  data: IMessageDetail[];
}

export interface IConversationsGetResponse {
  data: IConversationDetail[];
}

export interface IMessageUnreadCountResponse {
  count: number;
}

// flags
export interface IFlagCreatePayload {
  category: FlagCategory;
  description?: string;
  flaggedPostId?: string;
  flaggedCommentId?: string;
}

export interface IFlagUpdatePayload {
  status: FlagStatus;
  actionTaken?: FlagActionType;
  adminNotes?: string;
}

export interface IFlagDetail {
  id: string;
  category: FlagCategory;
  description?: string;
  status: FlagStatus;
  actionTaken?: FlagActionType;
  adminNotes?: string;
  createdAt: Date;
  reviewedAt?: Date;
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

export interface IFlagListResponse {
  flags: IFlagDetail[];
  total: number;
}

export interface IFlagCreateResponse {
  id: string;
}

// =============================================================================
// New naming convention aliases (Explorer/Entry/Expedition)
// =============================================================================

// Explorer (formerly User)
export type IExplorerDetail = IUserDetail;
export type IExplorerGetAllResponse = IUserGetAllResponse;
export type IExplorerGetByUsernameResponse = IUserGetByUsernameResponse;
export type IExplorerSettingsResponse = IUserSettingsResponse;
export type IExplorerSettingsUpdateQuery = IUserSettingsUpdateQuery;
export type IExplorerSettingsProfileGetResponse = IUserSettingsProfileGetResponse;
export type IExplorerSettingsProfileUpdatePayload = IUserSettingsProfileUpdatePayload;
export type IExplorerEntriesQueryResponse = IUserPostsQueryResponse;
export type IExplorerFollowersQueryResponse = IUserFollowersQueryResponse;
export type IExplorerFollowingQueryResponse = IUserFollowingQueryResponse;
export type IExplorerPictureUploadPayload = IUserPictureUploadPayload;
export type IExplorerPictureUploadClientPayload = IUserPictureUploadClientPayload;
export type IExplorerNotification = IUserNotification;
export type IExplorerNotificationGetResponse = IUserNotificationGetResponse;
export type IExplorerMapGetResponse = IUserMapGetResponse;

// Entry (formerly Post)
export type IEntryDetail = IPostDetail;
export type IEntryGetAllResponse = IPostGetAllResponse;
export type IEntryQueryResponse = IPostQueryResponse;
export type IEntryGetByIdResponse = IPostGetByIdResponse;
export type IEntryCreatePayload = IPostCreatePayload & { expeditionId?: string };
export type IEntryCreateResponse = IPostCreateResponse;
export type IEntryUpdatePayload = IPostUpdatePayload & { expeditionId?: string };
export type IEntryLikeResponse = IPostLikeResponse;
export type IEntryBookmarkResponse = IPostBookmarkResponse;
export type IEntryQueryMapResponse = IPostQueryMapResponse;
export type IEntryInsightsGetResponse = IPostInsightsGetResponse;

// Expedition (formerly Trip)
export type IExpeditionDetail = ITripDetail;
export type IExpeditionGetAllResponse = ITripGetAllResponse;
export type IExpeditionGetByIdResponse = ITripGetByIdResponse;
export type IExpeditionCreatePayload = ITripCreatePayload;
export type IExpeditionCreateResponse = { expeditionId: string };
export type IExpeditionBookmarkResponse = { bookmarksCount: number };
export type IExpeditionUpdatePayload = ITripUpdatePayload;
export type IExplorerBookmarkResponse = { bookmarked: boolean };

// =============================================================================
// Admin Dashboard types
// =============================================================================

export interface IAdminStats {
  explorers: number;
  entries: number;
  expeditions: number;
  pendingFlags: number;
  blockedExplorers: number;
}

export interface IAdminEntryListItem {
  id: string;
  title: string;
  author: {
    username: string;
    picture?: string;
  };
  createdAt: Date;
  deletedAt?: Date;
}

export interface IAdminEntryListResponse {
  data: IAdminEntryListItem[];
  total: number;
}

export interface IAdminExpeditionListItem {
  id: string;
  title: string;
  status?: string;
  author: {
    username: string;
    picture?: string;
  };
  createdAt: Date;
  deletedAt?: Date;
}

export interface IAdminExpeditionListResponse {
  data: IAdminExpeditionListItem[];
  total: number;
}

export interface IAdminExplorerListItem {
  username: string;
  email: string;
  role: string;
  blocked: boolean;
  createdAt: Date;
  picture?: string;
}

export interface IAdminExplorerListResponse {
  data: IAdminExplorerListItem[];
  total: number;
}
