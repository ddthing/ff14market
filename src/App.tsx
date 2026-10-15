import { Suspense, lazy, useState, type ComponentType } from 'react'
import { BrowserRouter as Router, StaticRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { useEffect } from 'react'
import { useThemeStore } from './store/useThemeStore'

import { ToastContainer } from './components/ui/ToastContainer';
import { GlobalSearch } from './components/ui/GlobalSearch';
import { loadItemDetail } from './routes/itemDetail';
import type { ItemCatalogEntry } from './api/itemCatalog';

// Lazy load pages
// Keep the primary dashboard out of secondary-route bundles while preserving
// its server-rendered markup through the route component supplied at hydration.
const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const HotIssues = lazy(() => import('./pages/HotIssues').then(m => ({ default: m.HotIssues })));
const Favorites = lazy(() => import('./pages/Favorites').then(m => ({ default: m.Favorites })));
const ItemDetail = lazy(loadItemDetail);
const Guide = lazy(() => import('./pages/Guide').then(m => ({ default: m.Guide })));
const FAQ = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQ })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));

// Simple Loading Spinner for Suspense Fallback
const LoadingFallback = () => (
  <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center" role="status" aria-live="polite" aria-label="페이지를 불러오는 중">
    <span className="sr-only">페이지를 불러오는 중입니다.</span>
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-hairline)] border-t-[var(--app-accent)]" aria-hidden="true"></div>
  </div>
);

function RouteScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  return null;
}

type InitialRouteComponents = {
  dashboard?: ComponentType;
  hotIssues?: ComponentType;
  favorites?: ComponentType;
  itemDetail?: ComponentType<{ initialItem?: ItemCatalogEntry }>;
};

function AppContent({
  initialRouteComponents,
  initialItem,
}: {
  initialRouteComponents?: InitialRouteComponents;
  initialItem?: ItemCatalogEntry;
}) {
  const { theme } = useThemeStore();
  const [themeHydrated, setThemeHydrated] = useState(false);
  const DashboardRoute = initialRouteComponents?.dashboard ?? Dashboard;
  const HotIssuesRoute = initialRouteComponents?.hotIssues ?? HotIssues;
  const FavoritesRoute = initialRouteComponents?.favorites ?? Favorites;
  const ItemDetailRoute = initialRouteComponents?.itemDetail ?? ItemDetail;

  useEffect(() => {
    let active = true;
    const persist = useThemeStore.persist;
    const hydration = persist?.hasHydrated()
      ? Promise.resolve()
      : persist?.rehydrate() ?? Promise.resolve();

    void Promise.resolve(hydration).finally(() => {
      if (active) setThemeHydrated(true);
    });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!themeHydrated) return;

    const root = window.document.documentElement;
    
    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, themeHydrated]);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <div id="app-content" className="flex min-h-screen flex-col">
        <a className="skip-link" href="#main-content">
          본문으로 바로가기
        </a>
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="mobile-page-main container mx-auto flex-grow px-4 pb-20 pt-6 outline-none md:max-w-[1360px] md:px-8 md:py-8"
        >
          <ToastContainer />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<DashboardRoute />} />
              <Route path="/hot-issues" element={<HotIssuesRoute />} />
              <Route path="/favorites" element={<FavoritesRoute />} />
              <Route path="/item/:id" element={<ItemDetailRoute initialItem={initialItem} />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/support" element={<Support />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
      <GlobalSearch />
      <RouteScrollReset />
    </div>
  )
}

export type AppProps = {
  staticLocation?: string;
  initialRouteComponents?: InitialRouteComponents;
  initialItem?: ItemCatalogEntry;
}

function App({ staticLocation, initialRouteComponents, initialItem }: AppProps = {}) {
  return (
    <QueryClientProvider client={queryClient}>
      {staticLocation === undefined ? (
        <Router>
          <AppContent initialRouteComponents={initialRouteComponents} initialItem={initialItem} />
        </Router>
      ) : (
        <StaticRouter location={staticLocation}>
          <AppContent initialRouteComponents={initialRouteComponents} initialItem={initialItem} />
        </StaticRouter>
      )}
    </QueryClientProvider>
  );
}

export default App
