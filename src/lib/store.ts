import type {AnyAsyncFunction} from "@customTypes/types";
import {createSignal} from "solid-js";
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
const [currentVid, setCurrentVid] = createSignal<IVidWithCustom>();
const [currentBook, setCurrentBook] = createSignal<IVidWithCustom[]>();
const [currentChapLabel, setCurrentChapLabel] = createSignal("");
const [vjsPlayer, setVjsPlayer] = createSignal<VideoJsPlayer>();
const [showDownloadMenu, setShowDownloadMenu] = createSignal(false);
const [playerSpeed, setPlayerSpeed] = createSignal<string>();

export {
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
};
