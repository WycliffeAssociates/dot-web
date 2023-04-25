import {clientsClaim} from "workbox-core";
import {downloadZip} from "client-zip";
import {SW_CACHE_NAME} from "./constants";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import type {customVideoSources} from "@customTypes/types";
declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

let precacheUrls = self.__WB_MANIFEST;
precacheAndRoute(precacheUrls);

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
      console.log({totalSize});

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
      let {readable, writable} = new TransformStream();
      const response = downloadZip(lazyFetch());
      response.body?.pipeTo(writable);
      if (downloadToDevice) {
        return new Response(readable, {
          headers: {
            "Content-Type": "application/octet-stream; charset=utf-8",
            "Content-Disposition": 'attachment; filename="dot.zip"',
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
