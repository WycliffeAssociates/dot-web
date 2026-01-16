import {defineAction, ActionError} from "astro:actions";
import {z} from "astro/zod";
import {playbackApi} from "@customTypes/Api";
import {env} from "cloudflare:workers";

export const server = {
  getPlaylist: defineAction({
    input: z.object({
      playlist: z.string(),
    }),
    handler: async ({playlist}) => {
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
