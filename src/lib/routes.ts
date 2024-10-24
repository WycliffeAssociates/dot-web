import type {PlaylistResponse} from "@customTypes/Api";

export const DOWNLOAD_SERVICE_WORK_URL = "download-video";

export async function getPlaylistData(origin: string, playlist: string) {
  try {
    const urlToFetch = `${origin}/api/getPlaylist?playlist=${playlist}`;
    const response = await fetch(urlToFetch);
    if (response.ok) {
      const data = response.json() as PlaylistResponse;
      return data;
    }
  } catch (error) {
    console.error(error);
    return;
  }
}
