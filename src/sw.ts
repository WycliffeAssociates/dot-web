import {clientsClaim} from "workbox-core";
import {downloadZip} from "client-zip";
import {SW_CACHE_NAME} from "./constants";
import {cleanupOutdatedCaches, precacheAndRoute} from "workbox-precaching";
import {registerRoute} from "workbox-routing";
import {StaleWhileRevalidate} from "workbox-strategies";
import {CacheableResponsePlugin} from "workbox-cacheable-response";
import {ExpirationPlugin} from "workbox-expiration";

self.__WB_DISABLE_DEV_LOGS = true;

import type {customVideoSources} from "@customTypes/types";
declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({url, sameOrigin, request}) => {
    const isForVidJs =
      url.href.includes("https://players.brightcove.net/6314154063001") ||
      url.href.includes(
        "https://players.brightcove.net/videojs-vtt.js/0.15.4/vtt.global.min.js"
      );

    const alsoCache =
      sameOrigin &&
      (/\/icons\/.*\.png/.test(url.href) ||
        /fonts\/.+\/.+.woff[2]?/.test(url.href) ||
        request.destination == "image");
    if (isForVidJs) {
      console.log("vidjs file acknowledged from the service worker!");
    }
    return isForVidJs || alsoCache;
    // return false;
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
  ({request}) => {
    if (request.mode == "navigate") {
      console.log("dot-html cache hit");
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

// downloads
self.addEventListener("fetch", async (event) => {
  if (event.request.url.match(/sw-handle-saving/)) {
    async function handleFormRequest() {
      const formData = await event.request.text();
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
      /* String, not boolean compare.  url encoded is sending strings */
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
      const totalSize = payloadData.reduce((sum, current) => {
        if (!current.size) return sum;
        sum += current.size;
        return sum;
      }, 0);
      const fileName = payloadData[0].name;

      // const fetchPromises = arrUrls.map((url) => {
      //   return fetch(url);
      // });
      async function* lazyFetch() {
        for (const srcObj of payloadData) {
          try {
            const resp = await fetch(srcObj.src);
            const body = resp.body;
            if (!resp.ok || !body) return;
            if (downloadToDevice && saveToSw) {
              const [readableDownload, readableSw] = body.tee();
              if (srcObj.refId) {
                sendItToSw(srcObj.refId, readableSw, resp);
              }
              const data = {
                name: `${srcObj.name}.mp4`,
                input: readableDownload,
                lastModified: resp.headers.get("last-modified"),
              };
              yield data;
            } else if (downloadToDevice) {
              const data = {
                name: `${srcObj.name}.mp4`,
                input: resp.body,
                lastModified: resp.headers.get("last-modified"),
              };
              yield data;
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
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
        testCache.put(name, res);
      }
      const {readable, writable} = new TransformStream();
      const response = downloadZip(lazyFetch());
      response.body?.pipeTo(writable);
      if (downloadToDevice) {
        return new Response(readable, {
          headers: {
            "Content-Type": "application/octet-stream; charset=utf-8",
            "Content-Disposition": `attachment; filename=${fileName}.mp4`,
            "Content-Length": String(totalSize),
          },
        });
      } else {
        // SW only
        return new Response(readable, {
          headers: {
            "Content-Type": "application/json",
            "Content-Length": String(totalSize),
          },
        });
      }
    }
    return event.respondWith(handleFormRequest());
  }
});
