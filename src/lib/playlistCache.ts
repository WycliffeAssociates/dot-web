import {playbackApi} from "@customTypes/Api";
import type {PlaylistResponse} from "@customTypes/Api";

/**
 * Read-through accelerator for Brightcove playlists.
 *
 * DotWeb renders server-side on the same Cloudflare account as the
 * `dot-playlist-cache` worker, so it reads that worker's warm KV namespace
 * directly (zero HTTP — sub-ms, replicated to every PoP) and only falls back to
 * the live Brightcove Playback API on a miss. The cache is an accelerator, never
 * a hard dependency: a missing binding or an empty key just returns null so the
 * caller hits Brightcove exactly as before.
 *
 * KV shapes mirror the contract owned by `DotPlaylistCache/src/warm.ts` — keyed
 * `ref:<reference_id>` (also `id:<numericId>`), value `{ body, etag, warmedAt }`
 * where `body` is the Playback-API response shape.
 */

interface StoredPlaylist {
  body: PlaylistResponse;
  etag: string;
  warmedAt: string;
}

/**
 * A single warmed playlist by `reference_id` (or numeric id). Returns null on a
 * miss — unbound namespace, no key, or unparseable value — so the caller can
 * fall back to a live Brightcove fetch.
 */
async function getPlaylistFromCache(
  kv: KVNamespace | undefined,
  refOrId: string
): Promise<PlaylistResponse | null> {
  if (!kv) return null;
  const raw = (await kv.get(`ref:${refOrId}`)) ?? (await kv.get(`id:${refOrId}`));
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as StoredPlaylist).body;
  } catch {
    return null;
  }
}

/**
 * Fetch a playlist, warm cache first then live Brightcove. Returns the playlist
 * data on success, or null when the playlist genuinely isn't found (Brightcove
 * returned a non-OK status). Throws only on an unexpected/network failure, so
 * callers can distinguish "not found" from "error" the way they did before.
 */
export async function fetchPlaylist(
  env: any,
  playlist: string
): Promise<PlaylistResponse | null> {
  const cached = await getPlaylistFromCache(env.BRIGHTCOVE_PLAYLISTS, playlist);
  if (cached) {
    console.log(`⚡ playlist cache HIT: ${playlist}`);
    return cached;
  }
  console.log(`playlist cache MISS → Brightcove: ${playlist}`);

  const pbApi = new playbackApi({
    baseUrl: "https://edge.api.brightcove.com/playback/v1",
    baseApiParams: {
      headers: {
        Accept: `application/json;pk=${env.POLICY_KEY}`,
      },
    },
  });

  const res = await pbApi.accounts.getPlaylistsByIdOrReferenceId(
    env.ACCOUNT_ID,
    `ref:${playlist}`,
    {
      limit: 2000,
    }
  );

  return res.ok ? (res.data as PlaylistResponse) : null;
}
