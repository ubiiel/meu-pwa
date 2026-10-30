"use strict";

// Increment this value when intentionally changing the app-shell cache generation.
const CACHE_NAME = "meu-escolar-v3";
const CACHE_PREFIX = "meu-escolar-";
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const requests = APP_FILES.map((file) => new Request(
        new URL(file, self.registration.scope),
        { cache: "reload" }
      ));
      await cache.addAll(requests);

      const splashRequest = new Request(
        new URL("./assets/splash.png", self.registration.scope),
        { cache: "reload" }
      );
      await cache.add(splashRequest).catch(() => undefined);
    })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const freshRequest = new Request(event.request, { cache: "no-store" });
        const response = await fetch(freshRequest);
        if (response.ok && response.type === "basic") {
          await cache.put(event.request, response.clone()).catch((error) => {
            console.error("Não foi possível atualizar o cache do aplicativo.", error);
          });
        }
        return response;
      } catch (error) {
        const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
        if (cachedResponse) return cachedResponse;

        if (event.request.mode === "navigate") {
          const cachedPage = await cache.match(new URL("./index.html", self.registration.scope));
          if (cachedPage) return cachedPage;
        }

        throw error;
      }
    })()
  );
});
