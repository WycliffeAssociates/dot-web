import type {APIRoute} from "astro";
import type {customVideoSources} from "@customTypes/types";
import {downloadZip} from "client-zip";

export const POST: APIRoute = async ({request}) => {
  const formData = await request.text();
  if (!formData) {
    return new Response(null, {
      status: 400,
      statusText: "missing parameters",
    });
  }

  const parameterized = new URLSearchParams(formData);
  const stringPayload = parameterized.get("swPayload");
  if (!stringPayload) {
    return new Response(null, {
      status: 400,
      statusText: "missing parameters",
    });
  }

  let payloadData: customVideoSources[];
  try {
    payloadData = JSON.parse(stringPayload);
  } catch (error) {
    console.error(error);
    return new Response(null, {
      status: 400,
      statusText: "malformed payload",
    });
  }

  // SCENARIO 1: Single File (Direct Stream)
  if (payloadData.length === 1) {
    const srcObj = payloadData[0];
    const fileName = `${srcObj.name}.mp4`;
    const response = await fetch(srcObj.src);

    if (!response.ok) {
      return new Response(null, {status: response.status});
    }

    const bodyToReturn = response.body;
    if (!bodyToReturn) return new Response(null, {status: 500});

    return new Response(bodyToReturn, {
      headers: {
        "Content-Type": "application/octet-stream; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": response.headers.get("Content-Length") || "",
      },
    });
  }

  // SCENARIO 2: Multiple Files (Zip Stream)
  const fileName = `${payloadData[0].name}-playlist`;

  async function* lazyFetch() {
    for (const srcObj of payloadData) {
      try {
        const resp = await fetch(srcObj.src);
        const body = resp.body;
        if (!resp.ok || !body) continue;

        yield {
          name: `${srcObj.name}.mp4`,
          input: body,
          lastModified: new Date(),
        };
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
      "Content-Disposition": `attachment; filename="${fileName}.zip"`,
    },
  });
};
