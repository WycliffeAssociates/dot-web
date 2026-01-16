import {ActionError, defineAction } from "astro:actions";
import {env} from "cloudflare:workers";
import {playbackApi} from "@customTypes/Api";
import {z} from "astro/zod";

// This is for testings, since can't mock a ssr call in playwright browser
const globalPlaylistCache = new Map();
export const server = {
  getPlaylist: defineAction({
    input: z.object({
      playlist: z.string(),
    }),
    handler: async ({playlist}) => {
      // 2. Create a unique key for this request
  const cacheKey = `${origin}-${playlist}`;

  // 3. Return cached data immediately if it exists
  if (globalPlaylistCache.has(cacheKey)) {
    // Optional: Log to confirm it's working during tests
    if (import.meta.env.TESTING) {
      // 3. Return cached data immediately if it exists
      if (globalPlaylistCache.has(cacheKey)) {
        // Optional: Log to confirm it's working during tests
        if (import.meta.env.DEV)
          console.log(`⚡ Using in-memory cache for ${playlist}`);
        return globalPlaylistCache.get(cacheKey);
      }
    }
  }

      const policyKey = env.POLICY_KEY;
      const accountId = env.ACCOUNT_ID;

      const pbApi = new playbackApi({
        baseUrl: "https://edge.api.brightcove.com/playback/v1",
        baseApiParams: {
          headers: {
            Accept: `application/json;pk=${policyKey}`,
          },
        },
      });

      const res = await pbApi.accounts.getPlaylistsByIdOrReferenceId(
        accountId,
        `ref:${playlist}`,
        {
          limit: 2000,
        }
      );

      if (!res.ok) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: `Playlist "${playlist}" not found`,
        });
      }
      if (import.meta.env.TESTING) {
        globalPlaylistCache.set(cacheKey, res.data);
      }
      return res.data;
    },
  }),

  getPlayerConfig: defineAction({
    handler: async () => {
      const accountId = env.ACCOUNT_ID;
      const playerId = env.PLAYER_ID;

      if (!accountId || !playerId) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Missing environment configuration",
        });
      }

      return {accountId, playerId};
    },
  }),
};
