import type { MetadataRoute } from 'next'

const SITE_URL = 'https://shelbyscribe.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/reports`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/intel`, changeFrequency: 'daily', priority: 0.7 },
  ]
}
