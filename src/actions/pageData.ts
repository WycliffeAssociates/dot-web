import {defineAction} from "astro:actions";
import {playbackApi} from "@customTypes/Api";
import type {envPropsForPlayer, IVidWithCustom} from "@customTypes/types";
import config from "@src/domainConfig";
import {
  getPreferredLangFromHeader,
  getUserPreferences,
  groupObjectsByKey,
  mutateSortVidsArray,
} from "@utils";

const globalPlaylistCache = new Map();

export const getPageData = defineAction({
  handler: async (_: any, context: any) => {
    let originToMatch = import.meta.env.PROD
      ? context.url.origin
      : "drcswahili";

    if (
      originToMatch.includes(".pages.dev") ||
      originToMatch.includes("127.0.0.1") ||
      originToMatch.includes("localhost")
    ) {
      originToMatch = "drcswahili";
    }

    let matchingKey = Object.keys(config).find((key) =>
      originToMatch.toLowerCase().includes(key.toLowerCase())
    );

    if (!matchingKey || !config[matchingKey]) {
      return null;
    }

    const configObj = config[matchingKey];
    const playlist = configObj.playlist;
    const playlistDisplayName = configObj.displayName;

    if (!playlist) {
      return null;
    }

    const cacheKey = `${context.url.origin}-${playlist}`;
    let data: any;

    if (import.meta.env.CI && globalPlaylistCache.has(cacheKey)) {
      console.log(`⚡ Using in-memory cache for ${playlist}`);
      data = globalPlaylistCache.get(cacheKey);
    } else {
      const runtime = context.locals.runtime;
      const env = runtime.env;
      const policyKey = env.POLICY_KEY;
      const accountId = env.ACCOUNT_ID;

      try {
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

        if (res.ok) {
          data = res.data;
          if (import.meta.env.CI) {
            globalPlaylistCache.set(cacheKey, data);
          }
        } else {
          return null;
        }
      } catch (error) {
        console.error(error);
        return null;
      }
    }

    if (!data) {
      return null;
    }

    const preferredLocale = getPreferredLangFromHeader(context.request);

    let initialDict: any;
    try {
      const initialDictModule = await import(`../i18n/${preferredLocale}.ts`);
      initialDict = initialDictModule.default;
    } catch (error) {
      console.error({error});
      return null;
    }

    let videojsInitalDict: Record<string, string> | undefined;
    try {
      let module = await import(
        `../../node_modules/video.js/dist/lang/${preferredLocale}.json`
      );
      videojsInitalDict = module.default as Record<string, string>;
    } catch (error) {
      console.error({error});
    }

    const userPreferences = getUserPreferences(context);

    const vids = data.videos as IVidWithCustom[];
    if (!vids || !vids.length) {
      return null;
    }

    const {sortedVids, filteredByMatchingReferenceId} =
      mutateSortVidsArray(vids);
    const bucketized = groupObjectsByKey<IVidWithCustom, "book">(
      sortedVids,
      "book"
    );
    if (filteredByMatchingReferenceId.notMatching?.length) {
      bucketized.other = filteredByMatchingReferenceId.notMatching;
    }

    let cfEnv: envPropsForPlayer = {
      accountId: "",
      playerId: "",
    };
    if (import.meta.env.DEV) {
      cfEnv.accountId = import.meta.env.ACCOUNT_ID;
      cfEnv.playerId = import.meta.env.PLAYER_ID;
    } else {
      const runtime = context.locals.runtime;
      cfEnv.accountId = runtime.env.ACCOUNT_ID;
      cfEnv.playerId = runtime.env.PLAYER_ID;
    }
    if (!cfEnv.accountId || !cfEnv.playerId) {
      return null;
    }

    return {
      playlist,
      playlistDisplayName,
      preferredLocale,
      initialDict,
      videojsInitalDict,
      userPreferences,
      bucketized,
      cfEnv,
    };
  },
});
