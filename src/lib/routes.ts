import type {PlaylistResponse} from "@customTypes/Api";
import type {envPropsForPlayer, IVidWithCustom} from "@customTypes/types";
import config from "@src/domainConfig.ts";
import {
  getPreferredLangFromHeader,
  getUserPreferences,
  groupObjectsByKey,
  mutateSortVidsArray,
} from "@utils";

export const DOWNLOAD_SERVICE_WORK_URL = "download-video";
// This is for testings, since can't mock a ssr call in playwright browser
const globalPlaylistCache = new Map();

export async function getPlaylistData(origin: string, playlist: string) {
  // 2. Create a unique key for this request
  const cacheKey = `${origin}-${playlist}`;

  // 3. Return cached data immediately if it exists
  if (globalPlaylistCache.has(cacheKey)) {
    // Optional: Log to confirm it's working during tests
    if (import.meta.env.DEV)
      console.log(`⚡ Using in-memory cache for ${playlist}`);
    return globalPlaylistCache.get(cacheKey);
  }
  try {
    const urlToFetch = `${origin}/api/getPlaylist?playlist=${playlist}`;
    const response = await fetch(urlToFetch);
    if (response.ok) {
      const data = response.json() as PlaylistResponse;
      globalPlaylistCache.set(cacheKey, data);
      return data;
    }
  } catch (error) {
    console.error(error);
    return;
  }
}

export async function getPageData(Astro: any, origin?: string) {
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

  let matchingKey = Object.keys(config).find((key) =>
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
    let module = await import(
      `../../node_modules/video.js/dist/lang/${preferredLocale}.json`
    );
    videojsInitalDict = module.default as Record<string, string>;
  } catch (error) {
    console.error({error});
  }

  // DATA FETCHING
  let userPreferences = getUserPreferences(Astro);
  let data = await getPlaylistData(Astro.url.origin, playlist);
  if (!data) return null;

  // DATA SHAPING
  // type coercion here to add a few extra types below on this vids array.
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
  let cfEnv: envPropsForPlayer = {
    accountId: "",
    playerId: "",
  };
  if (import.meta.env.DEV) {
    (cfEnv.accountId = import.meta.env.ACCOUNT_ID),
      (cfEnv.playerId = import.meta.env.PLAYER_ID);
  } else {
    const runtime = Astro.locals.runtime;
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
}
