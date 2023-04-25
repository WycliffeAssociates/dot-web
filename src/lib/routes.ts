export const DOWNLOAD_SERVICE_WORK_URL = "sw-handle-saving";
const baseUrl = import.meta.env.PROD
  ? `${import.meta.env.BASE_URL}/api`
  : "http://127.0.0.1:8788/api";

export async function getPlaylistData(playlist: string) {
  try {
    const urlToFetch = `${baseUrl}/getPlaylist?playlist=${playlist}`;
    const response = await fetch(urlToFetch);
    if (response.ok) {
      let data = response.json();
      return data;
    }
  } catch (error) {
    console.error(error);
  }
}
export async function getCfBcIds() {
  try {
    const urlToFetch = `${baseUrl}/getId`;
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
