/* ============================================
   SAYODA CYBER FORCE — Service Worker
   Version: v3 (2026-09)
   ============================================ */

const CACHE = "sayoda-cyber-v3";
const ASSETS = [
  "/login.html",
  "/index.html",
  "/admin.html",
  "/manifest.json",
  "/logo.png",
  "/bg.png",
  "/sayed.png"
];

/* ============ INSTALL ============ */
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((a) => c.add(a).catch(() => null)))
    )
  );
});

/* ============ ACTIVATE ============ */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ============ FETCH ============ */
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  /* تجاهل كل الطلبات الخارجية (Supabase / YouTube / Google Fonts) */
  if (url.origin !== self.location.origin) return;

  /* --- صفحات HTML: network-first + fallback للـ cache --- */
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match("/login.html"))
        )
    );
    return;
  }

  /* --- ملفات ثابتة: cache-first + تحديث بالخلفية --- */
  e.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

/* ============ MESSAGE (SKIP WAITING) ============ */
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});