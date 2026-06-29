import {fetchPlaylist} from "@lib/playlistCache";
import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';

const globalPlaylistCache = new Map();

export const getPlaylist = defineAction({
  input: z.object({
    playlist: z.string(),
  }),
  handler: async ({ playlist }, context: any) => {
    const cacheKey = `${context.url.origin}-${playlist}`;
    
    if (import.meta.env.CI && globalPlaylistCache.has(cacheKey)) {
      console.log(`⚡ Using in-memory cache for ${playlist}`);
      return globalPlaylistCache.get(cacheKey);
    }

    const runtime = context.locals.runtime;
    const env = runtime.env;

    try {
      const data = await fetchPlaylist(env, playlist);

      if (data) {
        if (import.meta.env.CI) {
          globalPlaylistCache.set(cacheKey, data);
        }
        return data;
      } else {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Playlist not found",
        });
      }
    } catch (error) {
      if (error instanceof ActionError) throw error;
      console.error(error);
      throw new ActionError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch playlist",
      });
    }
  },
});
