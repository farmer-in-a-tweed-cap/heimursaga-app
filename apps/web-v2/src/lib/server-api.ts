/**
 * Server-side API fetchers for generateMetadata() in App Router pages.
 * These run on the server only — no auth needed (public endpoints).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/v1';

export interface ExpeditionMeta {
  title: string;
  description?: string;
  coverImage?: string;
  region?: string;
  authorUsername?: string;
}

export interface EntryMeta {
  title: string;
  body?: string;
  coverImage?: string;
  authorUsername?: string;
  authorName?: string;
  authorPicture?: string;
  publishedAt?: string;
  expeditionTitle?: string;
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
      title: data.title,
      description: data.description,
      coverImage: data.coverImage || data.cover_image,
      region: data.region,
      authorUsername: data.author?.username,
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
    return {
      title: data.title,
      body: data.content,
      coverImage: data.coverImage || data.media?.[0]?.original,
      authorUsername: data.author?.username,
      authorName: data.author?.name || data.author?.username,
      authorPicture: data.author?.picture,
      publishedAt: data.created_at,
      expeditionTitle: data.trip?.title,
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
