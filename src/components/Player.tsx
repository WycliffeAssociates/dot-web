import type {IVidWithCustom, userPreferencesI} from "@customTypes/types";
import {For, Show, createSignal, onMount} from "solid-js";
import {
  mobileHorizontalPadding,
  CONTAINER,
  debounce,
  playerCustomHotKeys,
  changePlayerSrc,
  jumpToNextChap,
  setNewBook,
  handlePopState,
  handleProgressBarHover,
  handlePlayRateChange,
  handleChapters,
  handleVerseProvidedInRouting,
  getAdjacentChap,
  trackAdjacentChap,
  updateHistory,
  handleVideoJsTaps,
  currentMp4Sources,
  manageShowingChapterArrows,
} from "@lib/UI";
import {
  currentVid,
  setCurrentVid,
  setCurrentBook,
  currentChapLabel,
  vjsPlayer,
  setVjsPlayer,
  playerSpeed,
  setPlayerSpeed,
  setVidProgress,
  setCurrentPlaylist,
} from "@lib/store";
import {
  IconChapBack,
  IconChapNext,
  LoadingSpinner,
  SpeedIcon,
  IconDownload,
  IconMaterialSymbolsChevronLeft,
  IconMaterialSymbolsChevronRight,
} from "@components/Icons";
import {ChapterList} from "@components/PlayerNavigation/ChaptersList";
import {SeekBarChapterText} from "@components/Player/SeekBarText";
import {PLAYER_LOADER_OPTIONS} from "src/constants";
import {useI18n} from "@solid-primitives/i18n";
import {DOWNLOAD_SERVICE_WORK_URL, getCfBcIds} from "@lib/routes";
import {throttle} from "@solid-primitives/scheduled";
import {createResizeObserver} from "@solid-primitives/resize-observer";
import {normalizeBookName, formatPlayListName} from "@utils";

interface IVidPlayerProps {
  vids: Record<string | number | symbol, IVidWithCustom[]>;
  playlist: string | undefined;
  initialData: {
    vids: IVidWithCustom[];
    chap: IVidWithCustom;
    verseRouting: string | undefined;
  };
  videojsInitalDict: Record<string, string> | undefined;
  userPreferences: userPreferencesI | undefined;
}
export function VidPlayer(props: IVidPlayerProps) {
  // I'm using the store.ts file as a way to pass around state without context.  (e.g. singletons). These setX calls at the top here run on the server once (since calling setX on any store on server is not the same value the client receives during hydration.)
  setCurrentVid(props.initialData.chap);
  setCurrentBook(props.initialData.vids);
  // next two lines disabled due to ssr and setting initial values
  // eslint-disable-next-line solid/reactivity
  setPlayerSpeed(props.userPreferences?.playbackSpeed || "1");
  // eslint-disable-next-line solid/reactivity
  setCurrentPlaylist(props.vids);
  const [t] = useI18n();
  const [showChapSliderButtons, setShowChapSliderButtons] = createSignal(true);
  const [jumpingForwardAmount, setJumpingForwardAmount] = createSignal();
  const [jumpingBackAmount, setJumpingBackAmount] = createSignal();
  const jumpAmount = 5;

  let playerRef: HTMLDivElement | undefined;
  let playerRefContainer: HTMLDivElement | undefined;
  let chaptersContainerRef: HTMLDivElement | undefined;
  const formName = "downloadData";

  //=============== OnMount augments video player  =============
  // This uses the https://github.com/brightcove/player-loader package instead of bare video js for two reasons; One is convenience, but the other is that the analytics for the playlists and player is already set versus having to wire up all the analytics.  It also leaves some of the control that is exposed in the BC Player UI since it's basically configuring the script in BC.  This must be run on mount with a dynamic import since the brightcove player loader uses the window global, which of course, doesn't run in SSR.  Since most of the functionality on the page is related to the player, there is pretty much 0 interactivity until the player loads.
  onMount(async () => {
    const curVid = currentVid;
    // mostly to satisfy ts
    if (!curVid) return;
    // get env vars from bc.
    const creds = await getCfBcIds(window.location.origin);
    if (!creds) {
      return (window.location.href = `${window.location.origin}/404`);
    }
    const {accountId, playerId} = creds;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore.  There are no types for this below
    const playerModule = await import("@brightcove/player-loader");
    const options = {
      ...PLAYER_LOADER_OPTIONS,
      refNode: playerRef,
      videoId: curVid.id,
      accountId,
      playerId,
    };

    const vPlayer = await playerModule.default(options);
    setVjsPlayer(vPlayer.ref);

    //  inline prevents auto full screen for mobile
    vPlayer.ref.playsinline(true);
    // Set to the langauge passed from the request header. Unfortunately at time of authoring, neither dictionary for videojs seems complete, so if we have an initial complete, so we import the json and merge in everything for a maximal dict if we have it, otherwise just use what comes on the player from BC.
    if (props.videojsInitalDict) {
      const currentDictVidJs = vPlayer.ref.languages_[navigator.language];
      const completeDict = {
        ...props.videojsInitalDict,
        ...currentDictVidJs,
      };
      vPlayer.ref.languages_[navigator.language] = completeDict;
    }
    vPlayer.ref.language(navigator.language);

    // Incrementally update the URL to the current book/chapter/verse
    const throttleProgressUpdates = throttle(() => {
      const curVid = currentVid;
      const currentTime = vjsPlayer()?.currentTime();

      const newPathArr = [];
      const book = curVid.book;
      const currentBookChapter = curVid.chapter;
      if (book) newPathArr.push(book);
      if (currentBookChapter) newPathArr.push(currentBookChapter);
      // if chapters.. replaceState with the 1Jn.1.2 chapter, where the last number is the beginning of the current chapter
      if (curVid.chapterMarkers && currentTime) {
        const curChapter = curVid.chapterMarkers.find((marker) => {
          return (
            marker.chapterStart < currentTime && marker.chapterEnd > currentTime
          );
        });
        if (curChapter && curChapter.startVerse)
          newPathArr.push(curChapter.startVerse);
      }

      const newUrl = `${window.location.origin}/${newPathArr.join(".")}`;
      history.replaceState(null, "", newUrl);
    }, 1000);
    vPlayer.ref.on("progress", () => {
      throttleProgressUpdates();
      const currentTime = vjsPlayer()?.currentTime();
      currentTime && setVidProgress(currentTime);
    });

    // Handle taps on mobile for play/pause/fast forward
    const videoJsDomEl = vPlayer.ref.el();
    handleVideoJsTaps({
      el: videoJsDomEl,
      rightDoubleFxn(number) {
        const curTime = vjsPlayer()?.currentTime();
        if (!curTime) return;
        // the extra minus jumpAmount is to account for fact that min tap amoutn is 2 to diff btw double and single taps, so we still want to allow the smallest measure of jump back;
        const newTime = number * jumpAmount + curTime - jumpAmount;
        vjsPlayer()?.currentTime(newTime);
        setJumpingForwardAmount(null);
        videoJsDomEl.classList.remove("vjs-user-active");
      },
      leftDoubleFxn(number) {
        const curTime = vjsPlayer()?.currentTime();
        if (!curTime) return;

        const newTime = curTime - number * jumpAmount - jumpAmount;
        vjsPlayer()?.currentTime(newTime);
        setJumpingBackAmount(null);
        videoJsDomEl.classList.remove("vjs-user-active");
      },
      singleTapFxn() {
        const plyr = vjsPlayer();
        if (!plyr) return;
        if (plyr.paused()) {
          plyr.play();
        } else {
          plyr.pause();
        }
      },
      doubleTapUiClue(dir, tapsCount) {
        if (dir == "LEFT") {
          setJumpingBackAmount(tapsCount * jumpAmount - 5);
          setJumpingForwardAmount(null);
        } else if (dir == "RIGHT") {
          setJumpingBackAmount(null);
          setJumpingForwardAmount(tapsCount * jumpAmount - 5);
        }
      },
    });

    // On desktop, handle hotkeys for seek forward and backward
    vPlayer.ref.on("keydown", (e: KeyboardEvent) =>
      playerCustomHotKeys({
        e,
        vjsPlayer: vPlayer.ref,
        increment: jumpAmount,
        setJumpingBackAmount,
        setJumpingForwardAmount,
      })
    );

    // setup. The reactivity in this case is the props, adn the props aren't going to change without routing to anotehr page.
    // eslint-disable-next-line solid/reactivity
    vPlayer.ref.one("loadedmetadata", async () => {
      // chapters not in the sense of book/chapter but in the sense of cue points in the video that mark verses
      handleChapters(curVid);
      // If we have a verse in Url (e.g.) Mrk.01.002, jump straight to that segment
      if (props.initialData.verseRouting) {
        const applicableChapter = await handleVerseProvidedInRouting(
          curVid,
          props.initialData.verseRouting
        );
        if (applicableChapter) {
          vPlayer.ref.currentTime(applicableChapter.chapterStart);
        }
      }

      // Adjust speed if present in user preference cookie (just in case someone consistently wants to watch things fast)
      if (props.userPreferences?.playbackSpeed) {
        vjsPlayer()?.playbackRate(Number(props.userPreferences?.playbackSpeed));
      }
    });

    //handle the actual hovering to update the chapter spot
    // This section adds an indicator of the chapters markers on hover
    const seekBar = vPlayer.ref.controlBar.progressControl.seekBar;
    const handleProgressHover = debounce(handleProgressBarHover, 10);
    seekBar.on("mouseover", handleProgressHover);
    seekBar.el().addEventListener(
      "mouseover",
      () => {
        const currentToolTip = document.querySelector(
          ".vjs-progress-control .vjs-mouse-display"
        ) as Element;
        const seekBarEl = (
          <SeekBarChapterText text={currentChapLabel} />
        ) as Node;
        currentToolTip.appendChild(seekBarEl);
      },
      {
        once: true,
      }
    );

    // Make forward/backward button work again since the chapters and book nav aren't full page reloads
    window.addEventListener("popstate", () => handlePopState());

    // For traditional mice, this manages buttons to handle left/right for when chapters buttons don't all fit on one page.
    createResizeObserver(chaptersContainerRef, (refRect) => {
      manageShowingChapterArrows(refRect, setShowChapSliderButtons);
    });
  });
  //=============== state setters / derived  =============
  return (
    <div class={`overflow-x-hidden ${CONTAINER} w-full sm:(rounded-lg)`}>
      <div
        ref={playerRefContainer}
        data-title="VideoPlayer"
        class="w-full mx-auto aspect-12/9 sm:aspect-video  relative  sm:(rounded-lg overflow-hidden)"
      >
        {/* Chapter Back */}
        <button
          data-title="chapNext"
          class={`text-surface w-12 h-12 md:w-20 md:h-20 bg-gray-200/40 grid place-content-center rounded-full hover:( text-primary bg-primary/10) absolute left-4 top-1/2 -translate-y-1/2 z-30 ${
            !trackAdjacentChap().prev && "hidden"
          }`}
          onClick={() => {
            getAdjacentChap("PREV");
            jumpToNextChap("PREV");
          }}
        >
          <IconChapBack />
        </button>
        <div
          ref={playerRef}
          id="PLAYER"
          class="w-full h-full grid place-content-center"
        >
          <LoadingSpinner classNames="w-16 h-16 text-primary" />
        </div>
        <Show when={jumpingBackAmount()}>
          <div
            id="seekRippleBackward"
            class="absolute w-1/4  top-0 left-0 bottom-0  grid place-content-center rounded-[0%_100%_100%_0%_/_50%_50%_50%_50%] z-40  capitalize font-bold text-base pointer-events-none seekRipple"
          >
            {String(jumpingBackAmount())}
          </div>
        </Show>
        <Show when={jumpingForwardAmount()}>
          <div
            id="seekRippleForward"
            class="absolute w-1/4  top-0 right-0 bottom-0 seekRipple  grid place-content-center capitalize font-bold text-base z-40 rounded-[100%_0%_0%_100%_/_50%_50%_50%_50%] pointer-events-none"
          >
            {String(jumpingForwardAmount())}
          </div>
        </Show>

        <button
          data-title="chapBack"
          class={`text-surface w-12 h-12 md:w-20 md:h-20 bg-gray-200/40 grid place-content-center rounded-full hover:( text-primary bg-primary/10) absolute right-4 top-1/2 -translate-y-1/2 z-30 ${
            !trackAdjacentChap().next && "hidden"
          }`}
          onClick={() => {
            getAdjacentChap("NEXT");
            jumpToNextChap("NEXT");
          }}
        >
          <IconChapNext />
        </button>
      </div>

      <div data-title="VideoSupplmental" class="py-2 px-2">
        <div data-title="videoControl" class="flex gap-2">
          {/* Chapter Forward */}
          <span class="inline-flex gap-1 items-center">
            <input
              type="range"
              class="speedRange appearance-none bg-transparent cursor-pointer w-60 "
              min=".25"
              max="5"
              step=".25"
              value={props.userPreferences?.playbackSpeed || "1"}
              onInput={(e) => {
                setPlayerSpeed(e.target.value);
              }}
              onChange={(e) => {
                handlePlayRateChange(e);
              }}
            />
            <span class="inline-block h-5 w-5">
              <SpeedIcon />
            </span>
            <span class="inline-block ml-2">{playerSpeed()}</span>
          </span>
          {/* Speed Preference */}
          {/* <div data-title="downloadCurrentVid" class="relative ml-auto">
            <form
              action={DOWNLOAD_SERVICE_WORK_URL}
              method="post"
              name={formName}
            >
              <input
                type="hidden"
                name="swPayload"
                value={JSON.stringify([currentMp4Sources()?.[0]])}
              />
              <input
                type="hidden"
                name="swDownloadDevice"
                value={String("true")}
              />
              <button type="submit" class="">
                <IconDownload classNames="hover:text-primary" />
              </button>
            </form>
          </div> */}
        </div>
        <div class="flex">
          <Show when={showChapSliderButtons()}>
            <button
              class="pr-3 text-2xl"
              onClick={() => {
                const chapterBtnTrack = document.querySelector(
                  '[data-js="chapterButtonTrack"]'
                ) as HTMLUListElement;
                if (chapterBtnTrack) {
                  chapterBtnTrack.scrollLeft -= chapterBtnTrack.clientWidth;
                }
              }}
            >
              <IconMaterialSymbolsChevronLeft />
            </button>
          </Show>
          <div
            class="overflow-x-auto scrollbar-hide flex w-full"
            data-title="ChaptersNav"
            ref={chaptersContainerRef}
          >
            <ChapterList
              showChapSliderButtons={showChapSliderButtons}
              chapterButtonOnClick={(vid: IVidWithCustom) => {
                changePlayerSrc(vid);
              }}
              currentVid={currentVid}
            />
          </div>
          <Show when={showChapSliderButtons()}>
            <button
              class="pl-3 text-2xl"
              onClick={() => {
                const chapterBtnTrack = document.querySelector(
                  '[data-js="chapterButtonTrack"]'
                ) as HTMLUListElement;
                if (chapterBtnTrack) {
                  chapterBtnTrack.scrollLeft += chapterBtnTrack.clientWidth;
                }
              }}
            >
              <IconMaterialSymbolsChevronRight />
            </button>
          </Show>
        </div>
        <div
          data-title="BookAndPlaylistName"
          class={`${mobileHorizontalPadding} sm:(py-4)`}
        >
          <h1 class="font-bold">
            {" "}
            {normalizeBookName(
              currentVid?.localizedBookName || currentVid.book
            )}
          </h1>
          <p>{formatPlayListName(props.playlist)}</p>
        </div>
      </div>
      <div
        data-title="BookNav"
        class={`${mobileHorizontalPadding} py-2 bg-primary dark:bg-surface/05 text-base rounded-tr-xl rounded-tl-xl  scrollbar-hide min-h-200px`}
      >
        <h2 class="text-white dark:text-neutral-200 font-bold">
          {t("bibleSelection", undefined, "Bible Selection")}
        </h2>
        <p class="text-white dark:text-neutral-200">
          {t(
            "chooseABook",
            undefined,
            "Choose a book of the bible to watch here."
          )}
        </p>
        <div class="relative h-full sm:h-auto ">
          <div
            style={{
              position: "absolute",
              inset: "0",
              "pointer-events": "none",
              height: "100%",
            }}
            class="y-scroll-gradient sm:(hidden)"
          />
          <ul class="max-h-300px overflow-y-auto scrollbar-hide pt-8 pb-36 sm:(max-h-[50vh]) list-none">
            <For each={Object.entries(props.vids)}>
              {([key, book], idx) => {
                return (
                  <li class="text-neutral-100 dark:text-neutral-200 py-1 w-full border-y border-base md:text-lg md:py-2">
                    <button
                      onClick={() => {
                        setNewBook(book);
                        updateHistory(book[0], "PUSH");

                        // see if need to resize buttons track
                        const refRect =
                          chaptersContainerRef?.getBoundingClientRect();
                        manageShowingChapterArrows(
                          refRect,
                          setShowChapSliderButtons
                        );
                      }}
                      class={`inline-flex gap-2 items-center hover:(text-surface font-bold underline) ${
                        currentVid.custom_fields?.book?.toUpperCase() ===
                        key.toUpperCase()
                          ? "underline font-bold"
                          : ""
                      }`}
                    >
                      <span class="bg-base text-primary dark:text-primary rounded-full p-4 h-0 w-0 inline-grid place-content-center">
                        {idx() + 1}
                      </span>
                      {normalizeBookName(
                        book.find((b) => !!b.localizedBookName)
                          ?.localizedBookName || key
                      )}
                    </button>
                  </li>
                );
              }}
            </For>
          </ul>
        </div>
      </div>
    </div>
  );
}
