import React from 'react'
import ReactDOM, { hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './premium.css'

const root = document.getElementById('root')!
const isPrerenderedHome = root.dataset.prerendered === 'home'
const shouldHydrateHome = isPrerenderedHome && window.location.pathname === '/'
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

if (shouldHydrateHome) {
  hydrateRoot(root, app)
} else {
  // Pages serves the same shell for direct routes; do not briefly show the
  // prerendered homepage while the requested client route is mounting.
  if (isPrerenderedHome) root.replaceChildren()
  ReactDOM.createRoot(root).render(app)
}
