import React from 'react'
import ReactDOM, { hydrateRoot } from 'react-dom/client'
import App, { type AppProps } from './App.tsx'
import { registerServiceWorker } from './registerServiceWorker'
import { ITEM_DETAIL_DATA_SCRIPT_ID, parseItemDetailBootstrap } from './routes/itemBootstrap'
import type { ItemCatalogEntry } from './api/itemCatalog'
import './index.css'
import './premium.css'

type InitialRouteComponents = NonNullable<AppProps['initialRouteComponents']>

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root mount element')
const root: HTMLElement = rootElement

const app = (initialRouteComponents?: InitialRouteComponents, initialItem?: ItemCatalogEntry) => (
  <React.StrictMode>
    <App initialRouteComponents={initialRouteComponents} initialItem={initialItem} />
  </React.StrictMode>
)

function normalizePath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
}

function isMatchingPrerender(marker: string, pathname: string) {
  const path = normalizePath(pathname)
  if (marker === 'home') return path === '/'
  if (marker === 'hot-issues' || marker === 'favorites') return path === `/${marker}`

  const itemMarker = /^item:(\d+)$/.exec(marker)
  return itemMarker !== null
    && Number.isSafeInteger(Number(itemMarker[1]))
    && path === `/item/${itemMarker[1]}`
}

function readInitialItem(expectedId: number): ItemCatalogEntry | null {
  const script = document.getElementById(ITEM_DETAIL_DATA_SCRIPT_ID)
  if (!(script instanceof HTMLScriptElement)) return null
  return parseItemDetailBootstrap(script.textContent ?? '', expectedId)
}

async function loadInitialRouteComponents(marker: string): Promise<InitialRouteComponents> {
  if (marker === 'hot-issues') {
    const { HotIssues } = await import('./pages/HotIssues')
    return { hotIssues: HotIssues }
  }

  if (marker === 'favorites') {
    const { Favorites } = await import('./pages/Favorites')
    return { favorites: Favorites }
  }

  if (/^item:\d+$/.test(marker)) {
    const { ItemDetail } = await import('./pages/ItemDetail')
    return { itemDetail: ItemDetail }
  }

  return {}
}

async function mountApp() {
  const marker = root.dataset.prerendered
  if (marker && isMatchingPrerender(marker, window.location.pathname)) {
    try {
      const itemMarker = /^item:(\d+)$/.exec(marker)
      const initialItem = itemMarker ? readInitialItem(Number(itemMarker[1])) : undefined
      if (itemMarker && !initialItem) throw new Error('Invalid initial item metadata')
      const routeComponents = await loadInitialRouteComponents(marker)
      hydrateRoot(root, app(routeComponents, initialItem ?? undefined))
      return
    } catch {
      // A failed route chunk must still leave the browser on a usable client page.
    }
  }

  // Direct route shells and unknown item IDs use the normal client router.
  // Discard stale server markup before mounting a different route.
  if (marker) root.replaceChildren()
  ReactDOM.createRoot(root).render(app())
}

registerServiceWorker()
void mountApp()
