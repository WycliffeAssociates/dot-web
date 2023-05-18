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

// first poster with button that looks like play button
// vid data not loaded until a chapter is picked
// chapter picked => instantiate module
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
  let formDataRef: HTMLFormElement | undefined;
  let chaptersContainerRef: HTMLDivElement | undefined;
  const formName = "downloadData";

  //=============== state setters / derived  =============

  onMount(async () => {
    const curVid = currentVid;
    if (!curVid) return;
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
    // if (props.videojsInitalDict && window.videojs) {
    //   console.log("adding lang from initial dict");
    //   window.videojs.addLanguage(navigator.language, props.videojsInitalDict);
    // }
    // set state for later
    setVjsPlayer(vPlayer.ref);
    console.log({vPlayer});
    //  inline
    vPlayer.ref.playsinline(true);
    if (props.videojsInitalDict) {
      const currentDictVidJs = vPlayer.ref.languages_[navigator.language];
      const completeDict = {
        ...props.videojsInitalDict,
        ...currentDictVidJs,
      };
      vPlayer.ref.languages_[navigator.language] = completeDict;
    }
    vPlayer.ref.language(navigator.language);

    window.setTimeout(() => {
      console.log("running that timeout");
      vPlayer.ref.controlBar.playToggle.controlText_ = "Test me!";
    }, 1000 * 8);

    // update url
    // todo: buggy
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
    console.log(vPlayer.ref);
    const videoJsDomEl = vPlayer.ref.el();
    handleVideoJsTaps({
      el: videoJsDomEl,
      rightDoubleFxn(number) {
        const curTime = vjsPlayer()?.currentTime();
        // the extra minus jumpAmount is to account for fact that min tap amoutn is 2 to diff btw double and single taps, so we still want to allow the smallest measure of jump back;
        const newTime = number * jumpAmount + curTime - jumpAmount;
        console.log({newTime});
        vjsPlayer()?.currentTime(newTime);
        setJumpingForwardAmount(null);
        videoJsDomEl.classList.remove("vjs-user-active");
      },
      leftDoubleFxn(number) {
        const curTime = vjsPlayer()?.currentTime();
        const newTime = curTime - number * jumpAmount - jumpAmount;
        console.log({newTime});
        vjsPlayer()?.currentTime(newTime);
        setJumpingBackAmount(null);
        videoJsDomEl.classList.remove("vjs-user-active");
      },
      singleTapFxn() {
        const plyr = vjsPlayer();
        if (plyr.paused()) {
          console.log("playing");
          plyr.play();
        } else {
          console.log("pausing");
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
    console.log({el: videoJsDomEl});
    // vPlayer.ref.mobileUi({
    //   fullscreen: {
    //     enterOnRotate: true,
    //     exitOnRotate: true,
    //     lockOnRotate: true,
    //     lockToLandscapeOnEnter: false,
    //     iOS: false,
    //     disabled: false,
    //   },
    //   touchControls: {
    //     seekSeconds: 10,
    //     tapTimeout: 300,
    //     disableOnEnd: false,
    //     disabled: false,
    //   },
    // });
    // vjsPlayer().on("touchstart", (e) => {
    //   // e.stopPropagation();
    //   const plyr = vjsPlayer();
    //   console.log({e});
    //   console.log(e.touches.length);
    //   console.log(plyr.paused());
    //   if (e.touches.length === 1) {
    //     tapTimeoutId = window.setTimeout(() => {
    //       if (plyr.paused()) {
    //         console.log("playing");
    //         plyr.play();
    //       } else {
    //         console.log("pausing");
    //         plyr.pause();
    //       }
    //     }, 50);
    //   }
    // });

    // vPlayer.ref.on("touchend", (e) => {
    //   // console.log("touch end!");
    //   if (tapTimeoutId) {
    //     window.clearTimeout(tapTimeoutId);
    //   }
    // });
    // vPlayer.ref.on("touchcancel", (e) => {
    //   // console.log("touchcancel");
    //   if (tapTimeoutId) {
    //     window.clearTimeout(tapTimeoutId);
    //   }
    // });

    vPlayer.ref.on("keydown", (e: KeyboardEvent) =>
      playerCustomHotKeys({
        e,
        vjsPlayer: vPlayer.ref,
        increment: jumpAmount,
        setJumpingBackAmount,
        setJumpingForwardAmount,
      })
    );
    // get chapters for first video if exist

    // setup. The reactivity in this case is teh props, adn the props aren't going to change without routing to anotehr page.
    // eslint-disable-next-line solid/reactivity
    vPlayer.ref.one("loadedmetadata", async () => {
      handleChapters(curVid);
      if (props.initialData.verseRouting) {
        const applicableChapter = await handleVerseProvidedInRouting(
          curVid,
          props.initialData.verseRouting
        );
        if (applicableChapter) {
          vPlayer.ref.currentTime(applicableChapter.chapterStart);
        }
      }

      // Adjust speed if present in cookie
      if (props.userPreferences?.playbackSpeed) {
        vjsPlayer()?.playbackRate(Number(props.userPreferences?.playbackSpeed));
      }
    });
    // vPlayer.ref.on("play", () => {
    //   try {
    //     vPlayer.ref.enterFullWindow();
    //   } catch (error) {
    //     console.error({error});
    //   }
    // });
    // Add in Chapters text to the tool tip that shows up when you hover
    const seekBar = vPlayer.ref.controlBar.progressControl.seekBar;

    //handle the actual hovering to update the chapter spot
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

    window.addEventListener("popstate", () => handlePopState());

    createResizeObserver(chaptersContainerRef, (refRect, refNode) => {
      const chapterBtnTrack = document.querySelector(
        '[data-js="chapterButtonTrack"]'
      ) as HTMLUListElement;
      if (!chapterBtnTrack) return;
      if (chapterBtnTrack.scrollWidth > refRect.width) {
        setShowChapSliderButtons(true);
      } else setShowChapSliderButtons(false);
    });
  });
  //=============== state setters / derived  =============

  // return <p>Still fast here? x? y? z? a? b? c? d? e? f?</p>;
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
            !trackAdjacentChap(true).prev && "hidden"
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
            !trackAdjacentChap(true).next && "hidden"
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
          <div data-title="downloadCurrentVid" class="relative ml-auto">
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
          </div>
        </div>
        <div class="flex">
          <Show when={showChapSliderButtons()}>
            <button
              class="pr-6 text-2xl"
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
              formDataRef={formDataRef}
              chapterButtonOnClick={(vid: IVidWithCustom) => {
                formDataRef && formDataRef.reset();
                changePlayerSrc(vid);
              }}
              currentVid={currentVid}
            />
          </div>
          <Show when={showChapSliderButtons()}>
            <button
              class="pl-6 text-2xl"
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
          <h1 class="font-bold"> {normalizeBookName(currentVid?.book)}</h1>
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
                        formDataRef && formDataRef.reset();
                        setNewBook(book);
                        updateHistory(book[0], "PUSH");
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
                      {normalizeBookName(key)}
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
