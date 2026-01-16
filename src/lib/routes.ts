import {actions} from "astro:actions";
import {env} from "cloudflare:workers";
import type {envPropsForPlayer, IVidWithCustom} from "@customTypes/types";
import config from "@src/domainConfig.ts";
import {
  getPreferredLangFromHeader,
  getUserPreferences,
  groupObjectsByKey,
  mutateSortVidsArray,
} from "@utils";
import type {AstroGlobal} from "astro";

export const DOWNLOAD_SERVICE_WORK_URL = "/api/download";

export async function getPageData(Astro: AstroGlobal, origin?: string) {
  // FIGURE OUT WHICH PLAYLIST TO LOAD BASED ON DOMAIN
  let originToMatch = import.meta.env.PROD
    ? Astro.url.origin
    : origin || "drcswahili";
  if (
    originToMatch.includes(".pages.dev") ||
    originToMatch.includes("127.0.0.1") ||
    originToMatch.includes("localhost")
  ) {
    originToMatch = "drcswahili";
  }

  const matchingKey = Object.keys(config).find((key) =>
    originToMatch.toLowerCase().includes(key.toLowerCase())
  );
  if (!matchingKey || !config[matchingKey]) return null;
  const configObj = config[matchingKey];
  const playlist = configObj.playlist;
  const playlistDisplayName = configObj.displayName;
  if (!playlist) return null;

  // Setup i18n
  const preferredLocale = getPreferredLangFromHeader(Astro.request);
  const initialDictModule = await import(`../i18n/${preferredLocale}.ts`);
  const initialDict = initialDictModule.default;
  let videojsInitalDict;
  try {
    const module = await import(
      `../../node_modules/video.js/dist/lang/${preferredLocale}.json`
    );
    videojsInitalDict = module.default as Record<string, string>;
  } catch (error) {
    console.error({error});
  }

  // DATA FETCHING via Astro Action
  const userPreferences = getUserPreferences(Astro);
  const {data, error} = await Astro.callAction(actions.getPlaylist, {playlist});

  if (error || !data) {
    console.error("Failed to fetch playlist:", error);
    return null;
  }

  // DATA SHAPING
  const vids = data.videos as IVidWithCustom[];
  if (!vids || !vids.length) {
    return null;
  }
  const {sortedVids, filteredByMatchingReferenceId} = mutateSortVidsArray(vids);
  const bucketized = groupObjectsByKey<IVidWithCustom, "book">(
    sortedVids,
    "book"
  );
  if (filteredByMatchingReferenceId.notMatching?.length) {
    bucketized.other = filteredByMatchingReferenceId.notMatching;
  }

  // CLOUDFLARE ENV SETUP
  const cfEnv: envPropsForPlayer = {
    accountId: env.ACCOUNT_ID,
    playerId: env.PLAYER_ID,
  };
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
}
