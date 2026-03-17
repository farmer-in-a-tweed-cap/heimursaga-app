export type WaypointType = {
  id: string;
  title: string;
  location: string;
  description?: string;
  coords: { lat: number; lng: number };
  date: string;
  status: 'completed' | 'current' | 'planned';
  notes?: string;
  entryId?: string | null;
  entryIds: string[];
};

export type JournalEntryType = {
  id: string;
  title: string;
  date: string;
  location: string;
  coords: { lat: number; lng: number };
  excerpt: string;
  type: 'standard' | 'photo' | 'video' | 'data' | 'waypoint';
  mediaCount: number;
  views: number;
  visibility: 'public' | 'off-grid' | 'private';
  isMilestone: boolean;
  loggedDuringPlanning?: boolean;
  createdAt?: string;
  timelinePosition?: number;
};

export type DebriefStop = {
  type: 'waypoint' | 'entry';
  id: string;
  title: string;
  location: string;
  date: string;
  coords: { lat: number; lng: number };
  description?: string;
  status?: 'completed' | 'current' | 'planned';
  notes?: string;
  waypointIndex?: number;
  excerpt?: string;
  mediaCount?: number;
};

export type TransformedExpedition = {
  id: string;
  title: string;
  explorerId: string;
  explorerName: string;
  explorerPicture?: string;
  explorerIsPro: boolean;
  stripeAccountConnected: boolean;
  status: 'active' | 'planned' | 'completed' | 'cancelled';
  category: string;
  region: string;
  description: string;
  startDate: string;
  estimatedEndDate: string;
  daysActive: number;
  currentLocationSource?: 'waypoint' | 'entry';
  currentLocationId?: string;
  currentLocationVisibility: string;
  goal: number;
  raised: number;
  sponsors: number;
  followers: number;
  totalViews: number;
  totalEntries: number;
  totalWaypoints: number;
  tags: string[];
  privacy: string;
  commentsEnabled: boolean;
  imageUrl: string;
};

export type CurrentLocationData = {
  location: string;
  coords: { lat: number; lng: number };
  source: 'waypoint' | 'entry';
  title: string;
  date: string;
  status?: 'completed' | 'current' | 'planned';
  type?: string;
};

export type FundingStats = {
  activeSubscribers: number;
  monthlyRecurring: number;
  totalRecurringToDate: number;
};

export type SponsorWithTotal = {
  id: string;
  amount: number;
  totalContribution: number;
  type?: string;
  isPublic?: boolean;
  isMessagePublic?: boolean;
  message?: string;
  createdAt?: string;
  user?: { username: string };
  sponsor?: { username: string };
  tier?: { description?: string; price?: number };
};
