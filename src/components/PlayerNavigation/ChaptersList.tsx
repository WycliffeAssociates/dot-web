import type {IVidWithCustom} from "@customTypes/types";
import {type Accessor, For, Show} from "solid-js";
import {ChapterButton} from "./ChapterButton";
import {currentBook} from "@lib/store";

interface IChapterList {
  chapterButtonOnClick: (arg: IVidWithCustom) => void;
  currentVid: IVidWithCustom;
  showChapSliderButtons: Accessor<boolean>;
}
export function ChapterList(props: IChapterList) {
  return (
    <Show when={props.currentVid}>
      <ul
        data-testid="chapter-list-container"
        data-js="chapterButtonTrack"
        class={`flex flex-nowrap gap-3 items-start content-start px-2 py-4 overflow-x-auto scrollbar-hide  list-none scroll-smooth motion-reduce:scroll-auto w-full`}
      >
        <For each={currentBook()}>
          {(vid) => {
            return (
              <li>
                <ChapterButton
                  currentVid={props.currentVid}
                  vid={vid}
                  onClick={(vid) => props.chapterButtonOnClick(vid)}
                />
              </li>
            );
          }}
        </For>
      </ul>
    </Show>
  );
}
