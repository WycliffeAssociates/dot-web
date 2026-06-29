import {fetchPlaylist} from "@lib/playlistCache";
import type {APIRoute} from "astro";

export const GET: APIRoute = async (context) => {
  const runtime = context.locals.runtime;
  const env = runtime.env;
  const url = context.url;
  const playlist = url.searchParams?.get("playlist") as string;

  if (!playlist) {
    return new Response(null, {
      status: 400,
      statusText: "Missing parameters",
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    const data = await fetchPlaylist(env, playlist);
    if (data) {
      return new Response(JSON.stringify(data), {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else {
      return new Response(null, {
        status: 404,
      });
    }
  } catch (error) {
    console.error(error);
    return new Response(null, {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};
