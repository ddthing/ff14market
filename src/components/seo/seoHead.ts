export type SeoMetadata = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  structuredData?: Record<string, unknown>;
};

export type ResolvedSeoMetadata = {
  title: string;
  description: string;
  path: string;
  noIndex: boolean;
  robots: string;
  siteUrl: string;
  canonicalUrl: string;
  structuredData: Record<string, unknown>;
};

export const SITE_NAME = 'FF14 장터탐지기';
const MANAGED_META_NAMES = new Set([
  'description',
  'robots',
  'googlebot',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
]);
const MANAGED_META_PROPERTIES = new Set([
  'og:title',
  'og:description',
  'og:type',
  'og:site_name',
  'og:locale',
  'og:url',
  'og:image',
  'og:image:alt',
]);

export function itemDetailSeoMetadata(item: { id: number; name: string }): SeoMetadata {
  return {
    title: `${item.name} 시세 | ${SITE_NAME}`,
    description: `${item.name}의 한국 데이터센터 최저 매물가, 최근 판매량, 가격 흐름을 확인하세요.`,
    path: `/item/${item.id}`,
  };
}

export function resolveSeoMetadata(
  metadata: SeoMetadata,
  configuredSiteUrl: string | undefined,
  fallbackOrigin: string,
): ResolvedSeoMetadata {
  const siteUrl = (configuredSiteUrl?.trim() || fallbackOrigin).replace(/\/$/, '');
  const canonicalUrl = new URL(metadata.path || '/', `${siteUrl}/`).toString();
  const robots = metadata.noIndex ? 'noindex,follow' : 'index,follow';
  const pageType = metadata.path === '/' ? 'WebSite' : 'WebPage';

  return {
    title: metadata.title,
    description: metadata.description,
    path: metadata.path,
    noIndex: metadata.noIndex ?? false,
    robots,
    siteUrl,
    canonicalUrl,
    structuredData: {
      '@context': 'https://schema.org',
      '@type': pageType,
      name: metadata.title,
      description: metadata.description,
      url: canonicalUrl,
      inLanguage: 'ko-KR',
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${siteUrl}/`,
      },
      ...metadata.structuredData,
    },
  };
}

export function serializeStructuredData(value: Record<string, unknown>) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const escaped: Record<string, string> = {
      '<': '\\u003c',
      '>': '\\u003e',
      '&': '\\u0026',
      '\u2028': '\\u2028',
      '\u2029': '\\u2029',
    };
    return escaped[character];
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const escaped: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return escaped[character];
  });
}

function readAttribute(tag: string, attribute: string) {
  const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = tag.match(new RegExp(`\\b${escapedAttribute}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2];
}

export function getSeoOriginFromHtml(document: string, fallbackOrigin = 'https://ff14market.pages.dev') {
  const canonicalTag = document.match(/<link\b[^>]*>/gi)?.find(
    (tag) => readAttribute(tag, 'rel')?.toLowerCase() === 'canonical',
  );
  const canonicalHref = canonicalTag ? readAttribute(canonicalTag, 'href') : undefined;
  if (!canonicalHref) return fallbackOrigin;

  try {
    return new URL(canonicalHref).origin;
  } catch {
    return fallbackOrigin;
  }
}

export function renderSeoHeadMarkup(metadata: ResolvedSeoMetadata) {
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const canonicalUrl = escapeHtml(metadata.canonicalUrl);
  const siteUrl = escapeHtml(metadata.siteUrl);
  const siteName = escapeHtml(SITE_NAME);
  const robots = escapeHtml(metadata.robots);
  const jsonLd = serializeStructuredData(metadata.structuredData);

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${robots}" />`,
    `<meta name="googlebot" content="${robots}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${siteName}" />`,
    '<meta property="og:locale" content="ko_KR" />',
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:image" content="${siteUrl}/icon-512x512.png" />`,
    `<meta property="og:image:alt" content="${siteName} 앱 아이콘" />`,
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${siteUrl}/icon-512x512.png" />`,
    `<link rel="canonical" href="${canonicalUrl}" />`,
    `<script id="site-structured-data" type="application/ld+json">${jsonLd}</script>`,
  ].join('\n    ');
}

export function injectSeoHead(document: string, metadata: ResolvedSeoMetadata) {
  const headMarkup = renderSeoHeadMarkup(metadata);
  let cleanDocument = document.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, '');

  cleanDocument = cleanDocument.replace(/<meta\b[^>]*>/gi, (tag) => {
    const name = readAttribute(tag, 'name');
    const property = readAttribute(tag, 'property');
    return (name && MANAGED_META_NAMES.has(name))
      || (property && MANAGED_META_PROPERTIES.has(property))
      ? ''
      : tag;
  });
  cleanDocument = cleanDocument.replace(/<link\b[^>]*>/gi, (tag) => (
    readAttribute(tag, 'rel')?.toLowerCase() === 'canonical' ? '' : tag
  ));
  cleanDocument = cleanDocument.replace(
    /<script\b(?=[^>]*\bid=(['"])site-structured-data\1)[^>]*>[\s\S]*?<\/script>/i,
    '',
  );

  if (!/<\/head>/i.test(cleanDocument)) {
    throw new Error('Expected a closing </head> tag while injecting route metadata');
  }

  return cleanDocument.replace(/<\/head>/i, `${headMarkup}\n  </head>`);
}
