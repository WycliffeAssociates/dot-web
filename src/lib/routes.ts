export const DOWNLOAD_SERVICE_WORK_URL = "sw-handle-saving";
const baseUrl = import.meta.env.PROD ? `api` : "http://127.0.0.1:8788";
const devUrl = "http://127.0.0.1:8788/api";
export async function getPlaylistData(origin: string, playlist: string) {
  try {
    console.log(import.meta.env);
    const urlBase = import.meta.env.PROD ? origin : "http://127.0.0.1:8788/";
    const urlToFetch = `${urlBase}/api/getPlaylist?playlist=${playlist}`;
    const response = await fetch(urlToFetch);
    if (response.ok) {
      let data = response.json();
      return data;
    }
  } catch (error) {
    console.error(error);
  }
}
export async function getCfBcIds(origin: string) {
  try {
    const urlBase = import.meta.env.PROD ? origin : "http://127.0.0.1:8788/";
    const urlToFetch = `${urlBase}/api/getId`;
    const response = await fetch(urlToFetch);
    console.log({response});
    if (response.ok) {
      let data = response.json();
      return data;
    }
  } catch (error) {
    console.error(error);
  }
}
