import { useEffect } from 'react';

const SITE_NAME = 'FF14 장터탐지기';

type SeoProps = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown>;
};

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  const existing = Array.from(document.head.querySelectorAll('meta')).find(
    (meta) => meta.getAttribute(attribute) === key,
  );
  const meta = existing ?? document.createElement('meta');
  meta.setAttribute(attribute, key);
  meta.setAttribute('content', content);
  if (!existing) document.head.appendChild(meta);
};

export const Seo = ({ title, description, path, noIndex = false, structuredData }: SeoProps) => {
  useEffect(() => {
    const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();
    const siteUrl = (configuredSiteUrl || window.location.origin).replace(/\/$/, '');
    const canonicalUrl = new URL(path || '/', `${siteUrl}/`).toString();
    const pageType = path === '/' ? 'WebSite' : 'WebPage';

    document.documentElement.lang = 'ko';
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex,follow' : 'index,follow');
    upsertMeta('name', 'googlebot', noIndex ? 'noindex,follow' : 'index,follow');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'ko_KR');
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', `${siteUrl}/icon-512x512.png`);
    upsertMeta('property', 'og:image:alt', `${SITE_NAME} 앱 아이콘`);
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', `${siteUrl}/icon-512x512.png`);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    let structuredDataScript = document.getElementById('site-structured-data') as HTMLScriptElement | null;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'site-structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': pageType,
      name: title,
      description,
      url: canonicalUrl,
      inLanguage: 'ko-KR',
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${siteUrl}/`,
      },
      ...structuredData,
    });
  }, [description, noIndex, path, structuredData, title]);

  return null;
};
