import fs from 'node:fs';
import path from 'node:path';

const publicDirectory = path.resolve('public');
const DEFAULT_SITE_URL = 'https://ff14market.pages.dev';
const configuredSiteUrl = process.env.VITE_SITE_URL?.trim() || process.env.SITE_URL?.trim() || DEFAULT_SITE_URL;
// Legal pages stay publicly linked for trust and AdSense disclosures, but are
// not search landing pages and are marked noindex in the app and headers.
const coreRoutes = ['/', '/hot-issues', '/guide', '/faq', '/about', '/support'];

const normalizeSiteUrl = (value) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('HTTP(S) URL required');
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Invalid VITE_SITE_URL/SITE_URL: ${value}`);
  }
};

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const siteUrl = normalizeSiteUrl(configuredSiteUrl);
const sitemapPath = path.join(publicDirectory, 'sitemap.xml');
const robotsLines = [
  'User-agent: *',
  'Allow: /',
];

if (siteUrl) {
  robotsLines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
}

fs.mkdirSync(publicDirectory, { recursive: true });
fs.writeFileSync(path.join(publicDirectory, 'robots.txt'), `${robotsLines.join('\n')}\n`, 'utf8');

if (siteUrl) {
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...coreRoutes.map((route) => `  <url><loc>${escapeXml(`${siteUrl}${route}`)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
  fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  console.log(`Generated sitemap.xml for ${siteUrl}`);
} else {
  if (fs.existsSync(sitemapPath)) fs.rmSync(sitemapPath);
  console.log('VITE_SITE_URL/SITE_URL is not set; generated robots.txt without a sitemap URL.');
}
