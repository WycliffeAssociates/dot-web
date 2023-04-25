import type {
  IVidWithCustom,
  IpopulateSwPayload,
  customVideoSources,
  userPreferencesI,
  wholeBookPresets,
  chapterMarkers,
} from "@customTypes/types";
import type {Setter} from "solid-js";
import type {VideoJsPlayer} from "video.js";

import {
  currentBook,
  currentVid,
  setCurrentBook,
  setCurrentChapLabel,
  setCurrentVid,
  setDownloadPreference,
  vjsPlayer,
} from "@lib/store";
import {cleanUpOldChapters} from "@components/Player/ChapterMarker";
import {convertTimeToSeconds} from "./utils";
import {ChapterMarker} from "@components/Player/ChapterMarker";
import {SW_CACHE_NAME} from "src/constants";

const CONTAINER = "max-w-[1000px] mx-auto";
// @unocss-include
const mobileHorizontalPadding = "px-3";
export const debounce = <T extends unknown[]>(
  callback: (...args: T) => void,
  wait: number
): ((...args: T) => void) => {
  let timeoutId: number | null = null;
  return (...args: T) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, wait);
  };
};
// todo: for seeing what videos you have saved
export async function searchCache(
  url: string,
  cacheName?: string
): Promise<Response | undefined> {
  if (!("caches" in window)) {
    return undefined;
  }
  // todo: change to mathc, or just open the given cacheName
  const cache = cacheName
    ? await caches.open(cacheName)
    : await caches.open("my-cache");
  const matchingResponse = await cache.match(url);
  if (matchingResponse) {
    return matchingResponse;
  } else {
    return undefined;
  }
}
export function getJsonFromDocCookie(key?: string): userPreferencesI | null {
  let keyToUse = key || "userPreferences";
  const cookieVal = document.cookie
    .split(";")
    ?.find((row) => row.replaceAll(" ", "").startsWith(keyToUse))
    ?.split("=")?.[1];
  if (!cookieVal) return null;
  console.log(cookieVal);
  let parsedObj: object | null = null;
  try {
    parsedObj = JSON.parse(cookieVal);
  } catch (error) {
    console.error(error);
  }
  return parsedObj;
}

export function setCookie(value: string, key?: string): void {
  const keyToUse = key || "userPreferences";

  const defaultCookiesOptions = {
    expires: new Date("01-18-2038").toUTCString(),
    path: "/",
    secure: true,
    sameSite: "strict",
  };
  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies cookie prefxies

  const cookieString =
    `${keyToUse}=${value};` +
    `expires=${defaultCookiesOptions.expires};` +
    defaultCookiesOptions.path +
    +(defaultCookiesOptions.secure ? `secure;` : "") +
    (defaultCookiesOptions.sameSite
      ? `sameSite=${defaultCookiesOptions.sameSite};`
      : "");

  document.cookie = cookieString;
}
export function playerCustomHotKeys(
  e: KeyboardEvent,
  vjsPlayer: VideoJsPlayer
) {
  const currentTime = vjsPlayer.currentTime();
  switch (e.key) {
    case "ArrowLeft":
      vjsPlayer.currentTime(currentTime - 5);
      break;
    case "ArrowRight":
      vjsPlayer.currentTime(currentTime + 5);
      break;
    default:
      break;
  }
}

export function handleColorSchemeChange(
  e: MediaQueryListEvent,
  setPrefersDark: Setter<boolean>
) {
  const htmlElement = document.querySelector("html") as HTMLHtmlElement;
  const currCookie: userPreferencesI = getJsonFromDocCookie() || {};
  if (e.matches) {
    htmlElement.classList.add("dark");
    setPrefersDark(true);
    // write prefersDark True to cookie
    const currCookie: userPreferencesI | null = getJsonFromDocCookie();

    if (currCookie) {
      currCookie.prefersDark = true;
    }
  } else {
    htmlElement.classList.remove("dark");
    setPrefersDark(false);
    const currCookie: userPreferencesI | null = getJsonFromDocCookie();
    if (currCookie) {
      currCookie.prefersDark = false;
    }
    // write prefersDark False to cookie
  }
  // write out cookie on change;
  setCookie(JSON.stringify(currCookie).trim());
}
export function setUpThemeListener(setPrefersDark: Setter<boolean>) {
  const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const htmlElement = document.querySelector("html") as HTMLHtmlElement;

  if (
    darkModeMediaQuery.matches &&
    !htmlElement.classList.contains("light") &&
    !htmlElement.classList.contains("dark")
  ) {
    htmlElement.classList.add("dark");
    const currCookie: userPreferencesI = getJsonFromDocCookie() || {};
    currCookie.prefersDark = true;
    setCookie(JSON.stringify(currCookie).trim());
    setPrefersDark(true);
  }
  return darkModeMediaQuery;
}
export function updateCookiePrefByKey(key: keyof userPreferencesI, val: any) {
  const currCookie: userPreferencesI = getJsonFromDocCookie() || {};
  currCookie[key] = val;
  setCookie(JSON.stringify(currCookie).trim());
}
export function changeVid(chapNum: string | null | undefined) {
  const cb = currentBook();
  if (!chapNum || !cb) return;
  const newVid = cb.find((vid) => vid.chapter == chapNum);
  if (newVid) {
    setCurrentVid(newVid);
  }
}

export function changePlayerSrc(vid: IVidWithCustom) {
  if (!vjsPlayer()) return;

  changeVid(vid.chapter);
  vid.sources && vjsPlayer()?.src(vid.sources);
  vid.poster && vjsPlayer()?.poster(vid.poster);
  vjsPlayer()?.load();
  vjsPlayer()?.one("loadedmetadata", (e) => {
    handleChapters(vid);
  });
}
export async function fetchRemoteChaptersFile(src: string) {
  try {
    const chapterVttRes = await fetch(src);
    const chapterVtt = await chapterVttRes.text();
    return chapterVtt;
  } catch (error) {
    console.error(error);
    return;
  }
}
function distributeChapterMarkers(markers: chapterMarkers) {
  const plyr = vjsPlayer();
  if (!plyr) return;
  const sb = plyr.controlBar?.progressControl?.seekBar?.el();
  console.log({sb});
  markers.forEach((marker) => {
    const chapMarker = <ChapterMarker leftAmt={marker.xPos} />;
    sb.appendChild(chapMarker);
  });
}

export async function getChaptersArrFromVtt(vid: IVidWithCustom) {
  cleanUpOldChapters();
  const chapterObj = vid.text_tracks?.find((tt) => tt.kind === "chapters");
  if (!chapterObj || !chapterObj.src) return;
  if (vid.chapterMarkers) return vid.chapterMarkers;
  const plyr = vjsPlayer();
  if (!plyr) return;
  const chapterVtt = await fetchRemoteChaptersFile(chapterObj.src);
  if (!chapterVtt) return;
  const labelRegex = /(?:\d? ?\w+ ?\d*:)(\d+)-(\d+)/;
  /* 
  These should all match: optional digit, optional space, arbitrary num letters, optional space, 1+ number, colon (required), capture all digits after the colon, and be followed by a - and arbitrary digit numbes. 
  2 Pierre 2:1-3
John 2:1-3
2Pierre2:1-3
Luc2:17-28
  */
  // todo: move assigning of dom nodes into separate function so that this is only repsonsible for creating or return the vtt array
  const vttChapsArray = chapterVtt
    .split("\n\n")
    .filter((segment) => segment.includes("-->"))
    .map((chapter) => {
      const parts = chapter.split("\n");
      const timeStamp = parts[0].split("-->");
      const startTime = convertTimeToSeconds(timeStamp[0]);
      const endTime = convertTimeToSeconds(timeStamp[1]);
      const totalDur = plyr.duration();
      const labelMatches = parts[1].match(labelRegex);
      const xPos = String((startTime / totalDur) * 100);
      // const chapMarker = <ChapterMarker leftAmt={xPos} />;
      // const sb = plyr.controlBar.progressControl.seekBar.el();
      // console.log({sb});
      // sb.appendChild(chapMarker);
      return {
        chapterStart: startTime,
        chapterEnd: endTime,
        label: parts[1],
        startVerse: labelMatches ? labelMatches[1] : null,
        endVerse: labelMatches ? labelMatches[2] : null,
        xPos: xPos,
      };
    });
  vid.chapterMarkers = vttChapsArray;
  return vttChapsArray;
}
export async function handleChapters(vid: IVidWithCustom) {
  const chapters = await getChaptersArrFromVtt(vid);
  if (!chapters) return;
  distributeChapterMarkers(chapters);
}
export async function handleVerseProvidedInRouting(
  vid: IVidWithCustom,
  routingVerse: string
) {
  const numRouting = Number(routingVerse);
  if (!numRouting) return;
  const chapters = await getChaptersArrFromVtt(vid);
  if (!chapters || !chapters.length) return;
  const applicableChapter = chapters.find((chapter) => {
    return (
      Number(chapter.startVerse) <= numRouting &&
      Number(chapter.endVerse) >= numRouting
    );
  });
  return applicableChapter ? applicableChapter : null;
}

export function getChapterText(timeInSeconds: number) {
  const cVid = currentVid();
  if (!cVid || !cVid.chapterMarkers) return;
  const currentChap = cVid.chapterMarkers.find((marker) => {
    return (
      timeInSeconds >= marker.chapterStart && timeInSeconds < marker.chapterEnd
    );
  });
  if (!currentChap) return;
  return currentChap.label;
}
export function jumpToNextChap(dir: "NEXT" | "PREV") {
  const player = vjsPlayer();
  const currVid = currentVid();
  if (!player || !currVid) return;
  const currentTime = player.currentTime();
  if (!currentTime) return;

  if (dir == "NEXT") {
    const nextStart = currVid.chapterMarkers?.find(
      (marker) => marker.chapterStart > currentTime
    );
    if (nextStart) {
      vjsPlayer()?.currentTime(nextStart.chapterStart);
    }
  } else if (dir == "PREV") {
    const candidates = currVid.chapterMarkers?.filter(
      (marker) => marker.chapterEnd < currentTime
    );
    if (!candidates.length) return;
    const prevStart = candidates.reduce((acc, current) => {
      return acc.chapterEnd > current.chapterEnd ? acc : current;
    });
    if (prevStart) {
      vjsPlayer()?.currentTime(prevStart.chapterStart);
    }
  }
}
export function setNewBook(vids: IVidWithCustom[]) {
  setCurrentBook(vids);
  const firstBook = vids[0];
  setCurrentVid(firstBook);
  changePlayerSrc(firstBook);
}
export const getAllMp4sForBook = (preset: wholeBookPresets) => {
  const currBook = currentBook();
  if (!currBook) return;

  // {name:"higher quality", [srcs]}
  const mp4SrcObjects = currBook.reduce((acc: customVideoSources[], curr) => {
    const mp4s = curr.sources?.filter(
      (src) => src.container === "MP4" && src.src.includes("https")
    );
    let srcToUse = mp4s[0];
    if (preset === "BIG") {
      srcToUse = mp4s.reduce((maxObject, currentObject) => {
        if (!maxObject.size) return currentObject;
        if (!currentObject.size) return maxObject;
        if (!maxObject) {
          maxObject = currentObject;
          return maxObject;
        }
        if (currentObject.size > maxObject.size) {
          return currentObject;
        } else {
          return maxObject;
        }
      });
    } else if (preset === "SMALL") {
      srcToUse = mp4s.reduce((minObject, currentObject) => {
        if (!minObject.size) return currentObject;
        if (!currentObject.size) return minObject;
        if (!minObject) {
          minObject = currentObject;
          return minObject;
        }
        if (currentObject.size < minObject.size) {
          return currentObject;
        } else {
          return minObject;
        }
      });
    }
    if (!srcToUse) return acc;
    srcToUse.name = `${curr.book}-${curr.chapter}`;
    srcToUse.refId = String(curr.reference_id);
    acc.push(srcToUse);
    return acc;
  }, []);

  if (!mp4SrcObjects || !mp4SrcObjects.length) return;
  return mp4SrcObjects;
};

export const wholeBooksOptionsForSelect = () => {
  const currBook = currentBook();
  if (!currBook) return;
  const largestSizes = currBook.map((obj) =>
    Math.max(...obj.sources.map((src) => (src.size ? src.size : 0)))
  );
  const smallestSizes = currBook.map((obj) =>
    Math.min(
      ...obj.sources
        .filter((src) => !!src.size)
        .map((src) => (src.size ? src.size : Infinity))
    )
  );
  const totalSizeOfLargest = largestSizes.reduce((sum, size) => sum + size, 0);
  const totalSizeOfSmallest = smallestSizes.reduce(
    (sum, size) => sum + size,
    0
  );

  const result: {
    size: string;
    totalSize: number;
    wholeBooksOptionsForSelectId: wholeBookPresets;
  }[] = [
    {
      size: "biggest",
      totalSize: totalSizeOfLargest,
      wholeBooksOptionsForSelectId: "BIG",
    },
    {
      size: "smallest",
      totalSize: totalSizeOfSmallest,
      wholeBooksOptionsForSelectId: "SMALL",
    },
  ];
  return result;
};

export const currentMp4Sources = () => {
  const currVid = currentVid();
  if (!currVid) return;
  const mp4Srces = currVid.sources?.filter(
    (source) => source.container === "MP4" && source.src?.includes("https")
  );
  // todo: i think http vs https was the duplicates.  See if this is needed now
  const dedupedSizeChecker: number[] = [];
  const dedupedMp4s = mp4Srces.filter((src) => {
    if (!src.size) return false;
    if (dedupedSizeChecker.includes(src.size)) {
      return false;
    } else {
      src.size && dedupedSizeChecker.push(src.size);
      return true;
    }
  });
  dedupedMp4s.forEach((mp4) => {
    mp4.name = `${currVid.book}-${currVid.chapter}`;
    mp4.refId = String(currVid.reference_id);
  });
  return dedupedMp4s;
};

export function populateSwPayload({type, val}: IpopulateSwPayload) {
  if (type === "VID") {
    const currMp4s = currentMp4Sources();
    if (!currMp4s || !currMp4s.length) return;
    const matching = currMp4s.find((source) => String(source.size) === val);
    setDownloadPreference((prev) => {
      return {
        ...prev,
        swPayload: [matching],
      };
    });
  } else if (type === "BOOK") {
    const videoSources = getAllMp4sForBook(val);
    if (!videoSources || !videoSources.length) return;
    setDownloadPreference((prev) => {
      console.log({
        ...prev,
        swPayload: videoSources,
      });
      return {
        ...prev,
        swPayload: videoSources,
      };
    });
  }
}

export function handlePopState() {
  const currBook = currentBook();
  if (!currBook) return;
  const parts = window.location.pathname.split("/");
  const bookChap = parts[parts.length - 1];
  const bookChapParts = bookChap.split(".");
  console.log({bookChapParts});
  if (bookChapParts.length >= 2) {
    // book and chap
    const bookSeg = bookChapParts[0];
    const chapSeg = bookChapParts[1];
    console.log({bookSeg, chapSeg});

    const correspondingVid = currBook.find(
      (vid) =>
        vid.custom_fields?.book == bookSeg &&
        String(Number(vid.custom_fields?.chapter)) == chapSeg
    );
    console.log({correspondingVid});

    if (correspondingVid) {
      changePlayerSrc(correspondingVid);
    }
  }
}
export function handleProgressBarHover(event: Event) {
  const player = vjsPlayer();
  if (!player) return;
  const seekBar = player.controlBar.progressControl.seekBar;
  const currentToolTip = document.querySelector(
    ".vjs-progress-control .vjs-mouse-display"
  ) as Element;

  const distance = seekBar.calculateDistance(event);
  const totalDur = player.duration();
  const time = distance * totalDur;
  const chapLabel = getChapterText(time);
  if (chapLabel && currentToolTip) {
    setCurrentChapLabel(chapLabel);
  }
}
export function handlePlayRateChange(event: Event) {
  const player = vjsPlayer();
  const target = event.target as HTMLInputElement;
  if (!player) return;
  player.playbackRate(Number(target.value));
  const currCookie = getJsonFromDocCookie() || {};
  (currCookie.playbackSpeed = String(target.value)),
    setCookie(JSON.stringify(currCookie));
}
export async function getSavedResponseFromCache(
  vid: IVidWithCustom | undefined
) {
  const falsy = {
    response: null,
    isSaved: false,
  };
  if (import.meta.env.SSR) return falsy;
  if (!vid || !vid.reference_id) return falsy;
  const cache = await caches.open(SW_CACHE_NAME);
  const match = await cache.match(`/${vid.reference_id}`);
  if (!match || (match && match.status != 200)) {
    return falsy;
  } else
    return {
      response: match,
      isSaved: true,
    };
}

// Kobalte these components, add in i18n (including to player) see row, make the sw ts, and
// I need a select dropwdown for mp4 qualitites available for book:
// Download / Save (checkbox for each)
// Whole playlist / Whole Book / Current Video (radio)
// Single = pick your own.   So, select options depend on scope choice
// Whole book = smallest, or largest
// --Sizes (with a not about the lower the quality on size)
// Download (pressable)
// A callback for each to set the state in a signal which will write to urlFormEncoded to json stringify and hit the SW to be parsed.
// Prefer using saved video (with tooltip) (which writes to a cookie along with the dark/light toggle which should write to the same cookie)
// todo: make sure all selction of sources also checks that the source stirng is httpS and not http.
// todo:
// Indicator if is saved offline already (icones has a decent icon for this of cloud with checkmark or something)
export {mobileHorizontalPadding, CONTAINER};
