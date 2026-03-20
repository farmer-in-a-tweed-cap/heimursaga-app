// ─── Common ───

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

// ─── User / Explorer ───

export interface User {
  id: number;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  is_pro?: boolean;
  created_at?: string;
}

export interface ExplorerProfile {
  username: string;
  name?: string;
  picture?: string;
  coverPhoto?: string;
  bio?: string;
  locationFrom?: string;
  locationFromLat?: number;
  locationFromLon?: number;
  locationLives?: string;
  locationLivesLat?: number;
  locationLivesLon?: number;
  locationVisibility?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  portfolio?: string;
  equipment?: string[];
  creator?: boolean;
  memberDate?: string;
  entriesCount?: number;
  postsCount?: number;
  expeditionsCount?: number;
  followersCount?: number;
  followingCount?: number;
  followed?: boolean;
  bookmarked?: boolean;
  you?: boolean;
  stripeAccountConnected?: boolean;
  isPioneer?: boolean;
  activeExpeditionLocation?: {
    lat: number;
    lon: number;
    name: string;
    expeditionId: string;
    expeditionTitle: string;
  };
  activeExpeditionOffGrid?: boolean;
  sponsorsFund?: string;
  sponsorsFundType?: string;
  sponsorsFundExpeditionId?: string;
  recentExpeditions?: Array<{
    id: string;
    title: string;
    status: string;
    daysActive?: number;
  }>;
}

// ─── Expedition ───

export interface Expedition {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'planned' | 'completed' | 'cancelled';
  coverImage?: string;
  category?: string;
  region?: string;
  startDate?: string;
  endDate?: string;
  visibility?: 'public' | 'off-grid' | 'private';
  goal?: number;
  raised?: number;
  recurringStats?: {
    activeSponsors: number;
    monthlyRevenue: number;
    totalCommitted: number;
  };
  sponsorsCount?: number;
  entriesCount?: number;
  waypointsCount?: number;
  isRoundTrip?: boolean;
  notesVisibility?: 'public' | 'sponsor';
  notesAccessThreshold?: number;
  routeMode?: string;
  routeGeometry?: number[][];
  tags?: string[];
  author?: {
    username: string;
    name?: string;
    picture?: string;
    creator?: boolean;
    stripeAccountConnected?: boolean;
  };
  waypoints?: Waypoint[];
  bookmarked?: boolean;
}

export interface Waypoint {
  id: number;
  /** API returns `title`; legacy code may use `name` */
  title?: string;
  name?: string;
  lat?: number;
  lon?: number;
  /** Legacy field names from creation DTO */
  latitude?: number;
  longitude?: number;
  sequence?: number;
  order?: number;
  type?: 'origin' | 'waypoint' | 'destination';
  entryId?: string;
  entryIds?: string[];
}

// ─── Entry / Post ───

export interface Entry {
  id: string;
  title: string;
  content?: string;
  place?: string;
  date?: string;
  lat?: number;
  lon?: number;
  countryCode?: string;
  likesCount?: number;
  bookmarksCount?: number;
  commentsCount?: number;
  commentsEnabled?: boolean;
  public?: boolean;
  sponsored?: boolean;
  isDraft?: boolean;
  entryType?: string;
  isMilestone?: boolean;
  visibility?: string;
  trip?: {
    id: string;
    title: string;
    visibility?: string;
    status: string;
    entriesCount?: number;
    goal?: number;
    raised?: number;
    sponsorsCount?: number;
  };
  /** List endpoints use `expedition` instead of `trip` */
  expedition?: {
    id: string;
    title: string;
  };
  author: {
    username: string;
    name?: string;
    picture?: string;
    creator?: boolean;
    createdAt?: string;
    stripeAccountConnected?: boolean;
  };
  coverImage?: string;
  mediaCount?: number;
  media?: { id?: string; url?: string; thumbnail?: string; original?: string; caption?: string }[];
  bookmarked?: boolean;
  createdAt?: string;
  entryNumber?: number;
  expeditionDay?: number;
  quickSponsorsCount?: number;
  quickSponsorsTotal?: number;
}

// ─── Comment ───

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    username: string;
    picture?: string;
    creator?: boolean;
  };
  createdByMe?: boolean;
  parentId?: string;
  repliesCount?: number;
  replies?: Comment[];
}

// ─── Notification ───

export interface Notification {
  context: string;
  body?: string;
  read?: boolean;
  date: string;
  mentionUser?: {
    username: string;
    name?: string;
    picture?: string;
  };
  postId?: string;
  postTitle?: string;
  sponsorshipType?: string;
  sponsorshipAmount?: number;
  sponsorshipCurrency?: string;
  expeditionPublicId?: string;
  passportCountryName?: string;
  passportContinentName?: string;
  passportStampName?: string;
}

// ─── Message / Conversation ───

export interface Conversation {
  /** API field names */
  recipientUsername?: string;
  recipientName?: string;
  recipientPicture?: string;
  lastMessage?: { content: string; createdAt: string | Date; isFromMe: boolean };
  unreadCount?: number;
  /** Legacy field names (fallback) */
  username?: string;
  display_name?: string;
  avatar_url?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  is_pro?: boolean;
}

export interface Message {
  id: string | number;
  content?: string;
  body?: string;
  senderUsername?: string;
  sender_username?: string;
  recipientUsername?: string;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
  created_at?: string;
  sender?: { username: string; name?: string; picture?: string };
  recipient?: { username: string; name?: string; picture?: string };
}

// ─── Sponsorship ───

export interface Sponsorship {
  id: string;
  amount: number;
  type: 'one_time_payment' | 'subscription' | 'quick_sponsor';
  status: string;
  currency?: string;
  message?: string;
  isPublic?: boolean;
  isMessagePublic?: boolean;
  createdAt?: string;
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
  expedition?: {
    id: string;
    title: string;
    status?: string;
  };
  tier?: {
    id: string;
    title: string;
    price: number;
    description?: string;
  };
}

export interface SponsorshipTier {
  id: string;
  price: number;
  description?: string;
  type: 'ONE_TIME' | 'MONTHLY';
  priority?: number;
  membersCount?: number;
  isAvailable?: boolean;
}

export interface SponsorshipCheckout {
  clientSecret: string;
  paymentMethodId: string;
}

export interface PrepareCheckoutResponse {
  clientSecret: string;
  ephemeralKey: string;
  customerId: string;
  paymentIntentId: string;
}

// ─── Payout ───

export interface Payout {
  id: string;
  amount: number;
  status: string;
  currency?: { code: string; symbol: string };
  created?: string;
  arrival?: string;
}

export interface Balance {
  available: { amount: number; currency: string; symbol: string };
  pending: { amount: number; currency: string; symbol: string };
}

// ─── Bookmark ───

export interface BookmarksResponse {
  expeditions: Expedition[];
  entries: Entry[];
  explorers: ExplorerProfile[];
}

// ─── Search ───

export interface SearchResults {
  expeditions?: Expedition[];
  entries?: Entry[];
  explorers?: ExplorerProfile[];
}

// ─── Settings ───

export interface ProfileSettings {
  username: string;
  email: string;
  isEmailVerified?: boolean;
  bio?: string;
  picture?: string;
  locationFrom?: string;
  locationLives?: string;
  locationVisibility?: string;
  website?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  portfolio?: string;
  equipment?: string[];
  sponsorsFund?: string;
  sponsorsFundType?: string;
  notificationPreferences?: Record<string, boolean>;
  /** Legacy field name fallbacks */
  display_name?: string;
  name?: string;
  location?: string;
}
