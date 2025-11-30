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

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Nếu có mạng: Trả về dữ liệu mới và cập nhật vào cache
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Nếu mất mạng: Mới lấy từ cache
        return caches.match(event.request);
      })
  );
});
