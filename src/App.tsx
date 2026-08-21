import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { useEffect } from 'react'
import { useThemeStore } from './store/useThemeStore'

import { ToastContainer } from './components/ui/ToastContainer';

// Lazy load pages
const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const HotIssues = lazy(() => import('./pages/HotIssues').then(m => ({ default: m.HotIssues })));
const Favorites = lazy(() => import('./pages/Favorites').then(m => ({ default: m.Favorites })));
const ItemDetail = lazy(() => import('./pages/ItemDetail').then(m => ({ default: m.ItemDetail })));
const Guide = lazy(() => import('./pages/Guide').then(m => ({ default: m.Guide })));
const FAQ = lazy(() => import('./pages/FAQ').then(m => ({ default: m.FAQ })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Support = lazy(() => import('./pages/Support').then(m => ({ default: m.Support })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes caching
      gcTime: 300000, // 5 minutes garbage collection (cacheTime)
      refetchOnWindowFocus: false,
    },
  },
})

// Simple Loading Spinner for Suspense Fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-hairline)] border-t-[var(--app-accent)]"></div>
  </div>
);

function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
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
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen flex flex-col font-sans">
          <Header />
          <main className="mobile-page-main container mx-auto flex-grow px-4 pb-20 pt-6 md:max-w-6xl md:py-8">
            <ToastContainer />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/hot-issues" element={<HotIssues />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/item/:id" element={<ItemDetail />} />
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
      </Router>
    </QueryClientProvider>
  )
}

export default App
