// Exists only to satisfy PWA installability criteria in Chrome/Edge/Android
// (they require a registered service worker with a fetch handler before
// offering "Install app"). Intentionally does no caching — the app already
// has its own version-check and refresh-prompt flow (see APP_VERSION in
// src/lib/app-version.ts); a caching service worker here would fight that
// and risk serving stale bundles after a deploy.
self.addEventListener('fetch', () => {});
