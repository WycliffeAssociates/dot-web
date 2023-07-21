import type {PlaylistResponse} from "@customTypes/Api";

export const DOWNLOAD_SERVICE_WORK_URL = "sw-handle-saving";

export async function getPlaylistData(origin: string, playlist: string) {
  try {
    const urlBase = import.meta.env.PROD ? origin : "http://127.0.0.1:8788";
    const urlToFetch = `${urlBase}/api/getPlaylist?playlist=${playlist}`;
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
