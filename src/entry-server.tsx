import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { queryClient } from './queryClient';
import { Dashboard } from './features/dashboard/Dashboard';
import { HotIssues } from './pages/HotIssues';
import { Favorites } from './pages/Favorites';
import { ItemDetail } from './pages/ItemDetail';
import { SeoMetadataContext } from './components/seo/SeoMetadataContext';
import type { ResolvedSeoMetadata } from './components/seo/seoHead';
import type { ItemCatalogEntry } from './api/itemCatalog';

export type PrerenderRouteKind = 'home' | 'hot-issues' | 'favorites' | 'item';
export type RenderedRoute = { markup: string; seo: ResolvedSeoMetadata | null };

export function renderRoute(
  pathname: string,
  kind: PrerenderRouteKind,
  fallbackOrigin: string,
  initialItem?: ItemCatalogEntry,
): RenderedRoute {
  const initialRouteComponents = kind === 'home'
    ? { dashboard: Dashboard }
    : kind === 'hot-issues'
      ? { hotIssues: HotIssues }
      : kind === 'favorites'
        ? { favorites: Favorites }
        : kind === 'item'
          ? { itemDetail: ItemDetail }
          : undefined;
  let seo: ResolvedSeoMetadata | null = null;
  const seoCollector = { fallbackOrigin, capture: (metadata: ResolvedSeoMetadata) => { seo = metadata; } };

  try {
    const markup = renderToString(
      <SeoMetadataContext.Provider value={seoCollector}>
        <React.StrictMode>
          <App staticLocation={pathname} initialRouteComponents={initialRouteComponents} initialItem={initialItem} />
        </React.StrictMode>
      </SeoMetadataContext.Provider>,
    );
    return { markup, seo };
  } finally {
    queryClient.clear();
  }
}

export function renderHome(fallbackOrigin = 'https://ff14market.pages.dev') {
  return renderRoute('/', 'home', fallbackOrigin).markup;
}
