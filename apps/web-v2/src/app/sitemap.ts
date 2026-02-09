import type { MetadataRoute } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/v1';
const SITE_URL = 'https://heimursaga.com';

export const revalidate = 3600; // 1 hour ISR

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/explorers`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/expeditions`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/entries`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/documentation`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/explorer-guidelines`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/sponsorship-guide`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/upgrade`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/legal/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/legal/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Fetch dynamic pages from API
  try {
    const baseUrl = API_URL.replace('/v1', '');
    const res = await fetch(`${baseUrl}/v1/sitemap`, { next: { revalidate: 3600 } });
    if (!res.ok) return staticPages;

    const data = await res.json();

    const dynamicPages: MetadataRoute.Sitemap = [];

    if (data.expeditions) {
      for (const exp of data.expeditions) {
        dynamicPages.push({
          url: `${SITE_URL}/expedition/${exp.id}`,
          lastModified: exp.updatedAt ? new Date(exp.updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }

    if (data.entries) {
      for (const entry of data.entries) {
        dynamicPages.push({
          url: `${SITE_URL}/entry/${entry.id}`,
          lastModified: entry.updatedAt ? new Date(entry.updatedAt) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    }

    if (data.users) {
      for (const user of data.users) {
        dynamicPages.push({
          url: `${SITE_URL}/journal/${user.username}`,
          lastModified: user.updatedAt ? new Date(user.updatedAt) : new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }

    return [...staticPages, ...dynamicPages];
  } catch {
    return staticPages;
  }
}
