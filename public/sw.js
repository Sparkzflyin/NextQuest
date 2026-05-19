// Minimal service worker for NextQuest PWA installability.
// A fetch handler (even a pass-through) is required by Chrome to surface
// the automatic "Install app" prompt. We intentionally do not cache yet —
// the network is the source of truth and updates ship instantly.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op pass-through: lets the browser handle requests normally
  // while still satisfying the "has a fetch handler" install criterion.
});
