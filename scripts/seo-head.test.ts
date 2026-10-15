import assert from 'node:assert/strict';
import test from 'node:test';
import { injectSeoHead, resolveSeoMetadata } from '../src/components/seo/seoHead.ts';

const baseDocument = `<!doctype html>
<html lang="ko">
  <head>
    <title>FF14 장터탐지기</title>
    <meta name="description" content="홈 설명" />
    <meta name="robots" content="index,follow" />
    <meta name="googlebot" content="index,follow" />
    <meta property="og:title" content="홈 제목" />
    <meta property="og:description" content="홈 설명" />
    <meta property="og:url" content="https://ff14market.pages.dev/" />
    <link rel="canonical" href="https://ff14market.pages.dev/" />
    <meta name="google-site-verification" content="keep-this" />
  </head>
  <body><div id="root"></div></body>
</html>`;

test('route metadata uses the configured VITE_SITE_URL and replaces home metadata', () => {
  const metadata = resolveSeoMetadata({
    title: '오늘의 장터 신호 | FF14 장터탐지기',
    description: '거래량과 가격 하락 신호를 확인하세요.',
    path: '/hot-issues',
  }, 'https://market.example.test/', 'https://ff14market.pages.dev');
  const html = injectSeoHead(baseDocument, metadata);

  assert.match(html, /<title>오늘의 장터 신호 \| FF14 장터탐지기<\/title>/);
  assert.match(html, /<meta name="description" content="거래량과 가격 하락 신호를 확인하세요\." \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/market\.example\.test\/hot-issues" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/market\.example\.test\/hot-issues" \/>/);
  assert.match(html, /<meta name="google-site-verification" content="keep-this" \/>/);
  assert.doesNotMatch(html, /content="홈 설명"|content="홈 제목"|canonical" href="https:\/\/ff14market\.pages\.dev\//);
  assert.equal((html.match(/name="description"/g) ?? []).length, 1);
});

test('favorites route is noindex and uses the same canonical path in social metadata', () => {
  const metadata = resolveSeoMetadata({
    title: '내 관심 아이템 | FF14 장터탐지기',
    description: '저장한 파이널판타지14 아이템의 장터 시세를 빠르게 확인하세요.',
    path: '/favorites',
    noIndex: true,
  }, undefined, 'https://ff14market.pages.dev');
  const html = injectSeoHead(baseDocument, metadata);

  assert.match(html, /<meta name="robots" content="noindex,follow" \/>/);
  assert.match(html, /<meta name="googlebot" content="noindex,follow" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/ff14market\.pages\.dev\/favorites" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/ff14market\.pages\.dev\/favorites" \/>/);
});

test('item names and structured data cannot break out of head markup', () => {
  const unsafeName = 'A <script>alert("item")</script> & "quoted"';
  const metadata = resolveSeoMetadata({
    title: `${unsafeName} 시세 | FF14 장터탐지기`,
    description: `현재 시세: ${unsafeName}`,
    path: '/item/49238',
    structuredData: { alternateName: `</script><script>alert('json-ld')</script>` },
  }, undefined, 'https://ff14market.pages.dev');
  const html = injectSeoHead(baseDocument, metadata);

  assert.match(html, /&lt;script&gt;alert\(&quot;item&quot;\)&lt;\/script&gt; &amp; &quot;quoted&quot;/);
  assert.ok(html.includes(String.raw`\u003c/script\u003e\u003cscript\u003ealert('json-ld')`));
  assert.doesNotMatch(html, /<script>alert\("item"\)|<script>alert\('json-ld'\)/);
  assert.equal((html.match(/<script id="site-structured-data"/g) ?? []).length, 1);
});
