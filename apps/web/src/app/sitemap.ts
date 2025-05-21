import type { MetadataRoute } from 'next';

import { apiClient } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const sitemap = await apiClient.generateSitemap();

    const sources = sitemap.data?.sources || [];

    return sources.map(
      ({ loc, lastmod, priority = 1, changefreq = 'weekly' }) => ({
        url: loc,
        lastModified: lastmod,
        changeFrequency: changefreq as
          | 'always'
          | 'hourly'
          | 'daily'
          | 'weekly'
          | 'monthly'
          | 'yearly'
          | 'never',
        priority,
      }),
    );
  } catch (e) {
    // return an empty sitemap as fallback
    return [];
  }
}
