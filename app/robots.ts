import type {MetadataRoute} from 'next';
import {siteUrl} from '@/src/lib/site';

/**
 * /robots.txt — allow the public site, keep crawlers out of the internal admin
 * tool (which also carries `robots: noindex`, app/admin/layout.tsx — this is the
 * crawler-level backstop), and point at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {userAgent: '*', allow: '/', disallow: '/admin'},
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
