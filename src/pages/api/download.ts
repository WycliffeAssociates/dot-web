import type {customVideoSources} from "@customTypes/types";
import type {APIRoute} from "astro";
import {downloadZip} from "client-zip";

export const POST: APIRoute = async ({request}) => {
  try {
    let payload: customVideoSources[] = [];
    let downloadToDevice = true;

    const contentType = request.headers.get("Content-Type") || "";

    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      const payloadField = formData.get("payload");
      const downloadDeviceField = formData.get("downloadToDevice");

      if (payloadField && typeof payloadField === "string") {
        payload = JSON.parse(payloadField);
      }
      if (downloadDeviceField) {
        downloadToDevice = downloadDeviceField === "true";
      }
    } else {
      const body: any = await request.json();
      payload = body.payload as customVideoSources[];
      downloadToDevice = body.downloadToDevice ?? true;
    }

    const validPayload = payload.filter((p) => p.name);

    if (validPayload.length === 0) {
      return new Response("No valid video data provided", {
        status: 400,
      });
    }

    const totalSize = payload.reduce((sum, current) => {
      if (!current.size) return sum;
      sum += current.size;
      return sum;
    }, 0);

    if (payload.length === 1) {
      const srcObj = payload[0];
      const response = await fetch(srcObj.src);

      if (!response.ok) {
        return new Response(`Failed to download: ${response.status}`, {
          status: 400,
        });
      }

      const responseBody = response.body;
      if (!responseBody) {
        return new Response("No response body", {
          status: 500,
        });
      }

      const fileName = srcObj.name || "video";
      return new Response(responseBody, {
        headers: {
          "Content-Type": "application/octet-stream; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}.mp4"`,
          "Content-Length": String(totalSize),
        },
      });
    }

    const fileName = payload[0].name || "playlist";

    async function* lazyFetch() {
      for (const srcObj of payload) {
        try {
          const resp = await fetch(srcObj.src);
          const body = resp.body;
          if (!resp.ok || !body) continue;

          const data = {
            name: `${srcObj.name}.mp4`,
            input: body,
            lastModified: new Date(),
          };
          yield data;
        } catch (error) {
          console.error(error);
        }
      }
    }

    const {readable, writable} = new TransformStream();
    const response = downloadZip(lazyFetch());
    response.body?.pipeTo(writable);

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}-playlist.zip"`,
        "Content-Length": String(totalSize),
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Download failed", {
      status: 500,
    });
  }
};
