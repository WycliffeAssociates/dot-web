import type {IVidWithCustom} from "@customTypes/types";
import {Accessor, For, Show} from "solid-js";
import {ChapterButton} from "./ChapterButton";
import {currentBook} from "@lib/store";

interface IChapterList {
  formDataRef: HTMLFormElement | undefined;
  chapterButtonOnClick: (arg: IVidWithCustom) => void;
  currentVid: IVidWithCustom;
  showChapSliderButtons: Accessor<boolean>;
}
export function ChapterList(props: IChapterList) {
  return (
    <Show when={props.currentVid}>
      <ul
        data-js="chapterButtonTrack"
        class={`flex flex-nowrap gap-3 items-start content-start py-4 overflow-x-auto scrollbar-hide  list-none scroll-smooth motion-reduce:scroll-auto w-full	 ${
          props.showChapSliderButtons() ? "x-scroll-gradient" : ""
        }`}
      >
        <For each={currentBook()}>
          {(vid) => {
            return (
              <li>
                <ChapterButton
                  currentVid={props.currentVid}
                  vid={vid}
                  formDataRef={props.formDataRef}
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
