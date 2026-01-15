import type {customVideoSources} from "@customTypes/types";
import {downloadZip} from "client-zip";
import {CacheableResponsePlugin} from "workbox-cacheable-response";
import {clientsClaim} from "workbox-core";
import {ExpirationPlugin} from "workbox-expiration";
import {cleanupOutdatedCaches, precacheAndRoute} from "workbox-precaching";
import {registerRoute} from "workbox-routing";
import {CacheFirst, StaleWhileRevalidate} from "workbox-strategies";
import {SW_CACHE_NAME} from "./constants";

declare const self: ServiceWorkerGlobalScope;

// Force immediate activation
self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Explicit listeners to ensure activation happens immediately
self.addEventListener("install", () => void self.skipWaiting());
self.addEventListener("activate", () => void self.clients.claim());

precacheAndRoute(self.__WB_MANIFEST);

// --- ASSET ROUTES ---

registerRoute(
  ({url}) => {
    const isForVidJs =
      url.href.includes("https://players.brightcove.net/6314154063001") ||
      url.href.includes(
        "https://players.brightcove.net/videojs-vtt.js/0.15.4/vtt.global.min.js"
      );

    if (isForVidJs) {
      console.log("vidjs file acknowledged from the service worker!");
    }
    return isForVidJs;
  },
  new StaleWhileRevalidate({
    cacheName: "dot-assets",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200, 304],
      }),
    ],
  })
);

// static assets
registerRoute(
  ({url, sameOrigin, request}) => {
    const isVidJsCss = url.href.includes("video-js.css");
    const astroRegex = /\/_astro\/.+.((css)|(js))/gim;
    const fontsRegex = /fonts\/.+\/.+.woff[2]?/;
    const isAstroHashedContent = astroRegex.test(url.href);
    const isFont = fontsRegex.test(url.href);
    const isImage = sameOrigin && request.destination == "image";
    return isVidJsCss || isAstroHashedContent || isFont || isImage;
  },
  new CacheFirst({
    cacheName: "dot-static-assets",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200, 304],
      }),
    ],
  })
);

// cdn images
registerRoute(
  ({url}) => {
    const vidPosterRegex = /akamaihd.net\/image/;
    const isVidPoster = vidPosterRegex.test(url.href);
    return isVidPoster;
  },
  new CacheFirst({
    cacheName: "dot-cdn-assets",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200, 304],
      }),
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 60 * 60 * 24 * 30, //30 days
      }),
    ],
  })
);

// html navigations
registerRoute(
  ({request}) => {
    if (request.mode == "navigate") {
      return true;
    }
  },
  new StaleWhileRevalidate({
    cacheName: "dot-html",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [200, 304],
      }),
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 60 * 60 * 24 * 30 * 2, //60 days
      }),
    ],
  })
);

// --- DOWNLOAD ROUTE ---

registerRoute(
  ({url, sameOrigin}) => {
    // Matches "download-video" which is set in constants/routes
    const isVidSingleDownload = url.href.includes("download-video");
    return isVidSingleDownload && sameOrigin;
  },
  async ({request}) => {
    const formData = await request.text();
    if (!formData)
      return new Response(null, {
        status: 400,
        statusText: "missing parameters",
      });

    const parameterized = new URLSearchParams(formData);
    const stringPayload = parameterized.get("swPayload");
    if (!stringPayload)
      return new Response(null, {
        status: 400,
        statusText: "missing parameters",
      });

    let payloadData: customVideoSources[];
    const downloadToDevice = parameterized.get("swDownloadDevice") == "true";
    const saveToSw = parameterized.get("swSaveSw") == "true";

    if (!saveToSw && !downloadToDevice) {
      return new Response(null, {
        status: 400,
        statusText: "missing parameters",
      });
    }

    try {
      payloadData = await JSON.parse(stringPayload);
    } catch (error) {
      console.error(error);
      return new Response(null, {
        status: 400,
        statusText: "malformed payload",
      });
    }

    // Helper to save stream to Cache API
    async function sendItToSw(
      name: string,
      stream: ReadableStream<Uint8Array>,
      originalResp: Response
    ) {
      const testCache = await caches.open(SW_CACHE_NAME);
      const res = new Response(stream, {
        headers: {
          "Content-Length": originalResp.headers.get("Content-Length") || "",
          "Content-Type": "video/mp4",
        },
      });
      // Brightcove references are usually numbers/IDs
      await testCache.put(`/${name}`, res);
    }

    // SCENARIO 1: Single File (Direct Stream)
    if (payloadData.length === 1) {
      const srcObj = payloadData[0];
      const fileName = `${srcObj.name}.mp4`;
      const response = await fetch(srcObj.src);

      if (!response.ok) {
        return new Response(null, {status: response.status});
      }

      let bodyToReturn = response.body;
      if (!bodyToReturn) return new Response(null, {status: 500});

      if (saveToSw && srcObj.refId) {
        // Tee the stream: one to cache, one to user
        const [readableDownload, readableSw] = bodyToReturn.tee();
        bodyToReturn = readableDownload;
        // Don't await this, let it run in background
        sendItToSw(srcObj.refId, readableSw, response);
      }

      if (downloadToDevice) {
        return new Response(bodyToReturn, {
          headers: {
            "Content-Type": "application/octet-stream; charset=utf-8",
            "Content-Disposition": `attachment; filename=${fileName}`,
            "Content-Length": response.headers.get("Content-Length") || "",
          },
        });
      } else {
        // Just saving to SW, return success
        return new Response(JSON.stringify({saved: true}), {
          headers: {"Content-Type": "application/json"},
        });
      }
    }

    // SCENARIO 2: Multiple Files (Zip Stream)
    else {
      const totalSize = payloadData.reduce((sum, current) => {
        if (!current.size) return sum;
        sum += current.size;
        return sum;
      }, 0);
      const fileName = `${payloadData[0].name}-playlist`; // Or use book name if available

      async function* lazyFetch() {
        for (const srcObj of payloadData) {
          try {
            const resp = await fetch(srcObj.src);
            const body = resp.body;
            if (!resp.ok || !body) continue;

            if (downloadToDevice && saveToSw) {
              const [readableDownload, readableSw] = body.tee();
              if (srcObj.refId) {
                sendItToSw(srcObj.refId, readableSw, resp);
              }
              yield {
                name: `${srcObj.name}.mp4`,
                input: readableDownload,
                lastModified: new Date(),
              };
            } else if (downloadToDevice) {
              yield {
                name: `${srcObj.name}.mp4`,
                input: body,
                lastModified: new Date(),
              };
            } else if (saveToSw && srcObj.refId) {
              // Just saving, consume the body into cache
              await sendItToSw(srcObj.refId, body, resp);
            }
          } catch (error) {
            console.error(error);
          }
        }
      }

      if (downloadToDevice) {
        const {readable, writable} = new TransformStream();
        // client-zip takes the generator
        const response = downloadZip(lazyFetch());
        response.body?.pipeTo(writable);

        return new Response(readable, {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename=${fileName}.zip`,
            // Size is approximate or unknown for streamed zip usually, unless calculated
          },
        });
      } else {
        // Execute the generator just to cache files
        const generator = lazyFetch();
        let result = await generator.next();
        while (!result.done) {
          result = await generator.next();
        }
        return new Response(JSON.stringify({saved: true}), {
          headers: {"Content-Type": "application/json"},
        });
      }
    }
  },
  "POST"
);
