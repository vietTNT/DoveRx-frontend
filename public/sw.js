const CACHE_NAME = "doverx-cache-v1";
const urlsToCache = ["/", "/index.html", "/logo192.png", "/logo512.png"];

// 1. Cài đặt Service Worker
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Kích hoạt ngay lập tức
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Kích hoạt và xóa cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. QUAN TRỌNG: Phải có sự kiện FETCH thì mới hiện nút Cài Đặt
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Trả về cache nếu có, nếu không thì tải từ mạng
      return response || fetch(event.request);
    })
  );
});
