import type {AnyAsyncFunction} from "@customTypes/types";
import {createSignal} from "solid-js";
import {createStore} from "solid-js/store";
import type {VideoJsPlayer} from "video.js";
import type {IDownloadPreferences, IVidWithCustom} from "@customTypes/types";

const [downloadPreference, setDownloadPreference] =
  createSignal<IDownloadPreferences>({
    saveToServiceWorker: false,
    downloadOffline: true,
    justThisVideo: true,
    swPayload:
      null /* arr of vid {name, refid, src, size} objects that sw can digest */,
  });
const [currentVid, setCurrentVid] = createStore<IVidWithCustom>(
  {},
  {
    name: "currentVid",
  }
);
const [currentPlaylist, setCurrentPlaylist] =
  createSignal<Record<string | number | symbol, IVidWithCustom[]>>();
const [vidProgress, setVidProgress] = createSignal(0);
const [currentBook, setCurrentBook] = createSignal<IVidWithCustom[]>();
const [currentChapLabel, setCurrentChapLabel] = createSignal("");
const [vjsPlayer, setVjsPlayer] = createSignal<VideoJsPlayer>();
const [showDownloadMenu, setShowDownloadMenu] = createSignal(false);
const [playerSpeed, setPlayerSpeed] = createSignal<string>();

export {
  vidProgress,
  setVidProgress,
  downloadPreference,
  setDownloadPreference,
  currentVid,
  setCurrentVid,
  currentBook,
  setCurrentBook,
  currentChapLabel,
  setCurrentChapLabel,
  vjsPlayer,
  setVjsPlayer,
  showDownloadMenu,
  setShowDownloadMenu,
  playerSpeed,
  setPlayerSpeed,
  currentPlaylist,
  setCurrentPlaylist,
};
