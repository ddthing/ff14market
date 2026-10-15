/** Keep existing tabs on the same release as the active service worker. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  let hasController = navigator.serviceWorker.controller !== null;
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hasController) {
      // The first install claims this tab without interrupting the user's work.
      // A later update in the same tab still needs the normal release reload.
      hasController = true;
      return;
    }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      const activateWaiting = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      activateWaiting();
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed') activateWaiting();
        });
      });

      let lastCheck = Date.now();
      const checkForUpdate = () => {
        if (!navigator.onLine || document.visibilityState !== 'visible' || Date.now() - lastCheck < 60_000) return;
        lastCheck = Date.now();
        void registration.update().catch(() => { /* Retry when the page is next visible. */ });
      };
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', checkForUpdate);
    } catch {
      // The online app remains usable when service workers or storage are blocked.
    }
  };

  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', () => void register(), { once: true });
}
