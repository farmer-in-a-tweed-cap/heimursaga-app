/**
 * Server-side API fetchers for generateMetadata() in App Router pages.
 * These run on the server only — no auth needed (public endpoints).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/v1';

export interface ExpeditionMeta {
  publicId: string;
  title: string;
  description?: string;
  coverImage?: string;
  region?: string;
  startDate?: string;
  endDate?: string;
  authorUsername?: string;
  authorName?: string;
}

export interface EntryMeta {
  publicId: string;
  title: string;
  body?: string;
  coverImage?: string;
  images?: string[];
  authorUsername?: string;
  authorName?: string;
  authorPicture?: string;
  publishedAt?: string;
  date?: string;
  place?: string;
  lat?: number;
  lon?: number;
  entryType?: string;
  metadata?: Record<string, unknown>;
  expeditionTitle?: string;
  expeditionPublicId?: string;
}

export interface ExplorerMeta {
  username: string;
  displayName?: string;
  bio?: string;
  picture?: string;
}

export async function getExpedition(id: string): Promise<ExpeditionMeta | null> {
  try {
    const res = await fetch(`${API_URL}/trips/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      publicId: data.publicId || data.public_id || id,
      title: data.title,
      description: data.description,
      coverImage: data.coverImage || data.cover_image,
      region: data.region,
      startDate: data.startDate || data.start_date,
      endDate: data.endDate || data.end_date,
      authorUsername: data.author?.username,
      authorName: data.author?.name || data.author?.username,
    };
  } catch {
    return null;
  }
}

export async function getEntry(id: string): Promise<EntryMeta | null> {
  try {
    const res = await fetch(`${API_URL}/posts/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const images: string[] = Array.isArray(data.media)
      ? data.media.map((m: { original?: string; url?: string }) => m.original || m.url).filter(Boolean)
      : [];
    return {
      publicId: data.publicId || data.public_id || id,
      title: data.title,
      body: data.content,
      coverImage: data.coverImage || images[0],
      images,
      authorUsername: data.author?.username,
      authorName: data.author?.name || data.author?.username,
      authorPicture: data.author?.picture,
      publishedAt: data.created_at,
      date: data.date,
      place: data.place,
      lat: typeof data.lat === 'number' ? data.lat : undefined,
      lon: typeof data.lon === 'number' ? data.lon : undefined,
      entryType: data.entryType,
      metadata: data.metadata,
      expeditionTitle: data.trip?.title,
      expeditionPublicId: data.trip?.id || data.trip?.publicId,
    };
  } catch {
    return null;
  }
}

export async function getExplorerProfile(username: string): Promise<ExplorerMeta | null> {
  try {
    const res = await fetch(`${API_URL}/users/${username}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      username: data.username,
      displayName: data.display_name || data.username,
      bio: data.bio,
      picture: data.picture,
    };
  } catch {
    return null;
  }
}
