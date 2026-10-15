import { useContext, useEffect, useMemo } from 'react';
import { SeoMetadataContext } from './SeoMetadataContext';
import {
  resolveSeoMetadata,
  serializeStructuredData,
  SITE_NAME,
  type SeoMetadata,
} from './seoHead';

const upsertMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  const existing = Array.from(document.head.querySelectorAll('meta')).find(
    (meta) => meta.getAttribute(attribute) === key,
  );
  const meta = existing ?? document.createElement('meta');
  meta.setAttribute(attribute, key);
  meta.setAttribute('content', content);
  if (!existing) document.head.appendChild(meta);
};

export const Seo = ({ title, description, path, noIndex = false, structuredData }: SeoMetadata) => {
  const collector = useContext(SeoMetadataContext);
  const fallbackOrigin = collector?.fallbackOrigin
    ?? (typeof window !== 'undefined' ? window.location.origin : 'https://ff14market.pages.dev');
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL;
  const metadata = useMemo(
    () => resolveSeoMetadata(
      { title, description, path, noIndex, structuredData },
      configuredSiteUrl,
      fallbackOrigin,
    ),
    [configuredSiteUrl, description, fallbackOrigin, noIndex, path, structuredData, title],
  );

  if (collector) collector.capture(metadata);

  useEffect(() => {
    document.documentElement.lang = 'ko';
    document.title = metadata.title;
    upsertMeta('name', 'description', metadata.description);
    upsertMeta('name', 'robots', metadata.robots);
    upsertMeta('name', 'googlebot', metadata.robots);
    upsertMeta('property', 'og:title', metadata.title);
    upsertMeta('property', 'og:description', metadata.description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'ko_KR');
    upsertMeta('property', 'og:url', metadata.canonicalUrl);
    upsertMeta('property', 'og:image', `${metadata.siteUrl}/icon-512x512.png`);
    upsertMeta('property', 'og:image:alt', `${SITE_NAME} 앱 아이콘`);
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', metadata.title);
    upsertMeta('name', 'twitter:description', metadata.description);
    upsertMeta('name', 'twitter:image', `${metadata.siteUrl}/icon-512x512.png`);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = metadata.canonicalUrl;

    let structuredDataScript = document.getElementById('site-structured-data') as HTMLScriptElement | null;
    if (!structuredDataScript) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.id = 'site-structured-data';
      structuredDataScript.type = 'application/ld+json';
      document.head.appendChild(structuredDataScript);
    }
    structuredDataScript.textContent = serializeStructuredData(metadata.structuredData);
  }, [metadata]);

  return null;
};
