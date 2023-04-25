import {Select} from "@kobalte/core";
import {Show} from "solid-js";
import type {
  AnyFunction,
  customVideoSources,
  wholeBookPresets,
} from "@customTypes/types";
import {bytesToMb} from "@lib/utils";

interface ICommonSelect {
  formName: string;
  placeholder: string;
}

interface IWholeBookSelect extends ICommonSelect {
  selectOptions:
    | {
        size: string;
        totalSize: number;
        wholeBooksOptionsForSelectId: wholeBookPresets;
      }[]
    | undefined;
  onValueChange: (arg: wholeBookPresets) => void;
}
export function WholeDownloadSelect(props: IWholeBookSelect) {
  return (
    <Show when={props.selectOptions}>
      <Select.Root
        // name="downloads"
        name={props.formName}
        flip={false}
        hideWhenDetached={true}
        options={props.selectOptions}
        onValueChange={(val) => {
          const coerced = val as wholeBookPresets;
          props.onValueChange(coerced);
        }}
        optionValue={(val) => val.wholeBooksOptionsForSelectId}
        optionTextValue={(val) => `${val.size}`}
        placeholder={props.placeholder}
        valueComponent={(opt) =>
          `${opt.item.rawValue.size}-${bytesToMb(
            opt.item.rawValue.totalSize
          )} MB`
        }
        itemComponent={(opt) => (
          <Select.Item
            item={opt.item}
            class={`text-surface  data-[selected]:text-primary/80 hover:bg-primary/20 px-2`}
          >
            <Select.ItemLabel>
              {bytesToMb(opt.item.rawValue.totalSize)} MB
            </Select.ItemLabel>
            {/* <Select.ItemIndicator>C</Select.ItemIndicator> */}
          </Select.Item>
        )}
      >
        {/* <Select.HiddenSelect /> */}
        <Select.Trigger
          aria-label="Mp4 Quality"
          class="inline-flex items-center justify-between w-60 rounded-md py-2 pl-2 pr-4 text-surface/90 bg-surface/10 border border-surface/20 hover:border-surface/30 transition-colors duration-150"
        >
          <Select.Value class="text-ellipsis whitespace-nowrap overflow-hidden data-[placeholder-shown]:text-surface/80" />
          <Select.Icon class="text-surface/90 w-6 h-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
              viewBox="0 0 256 256"
            >
              <path
                fill="currentColor"
                d="M181.66 170.34a8 8 0 0 1 0 11.32l-48 48a8 8 0 0 1-11.32 0l-48-48a8 8 0 0 1 11.32-11.32L128 212.69l42.34-42.35a8 8 0 0 1 11.32 0Zm-96-84.68L128 43.31l42.34 42.35a8 8 0 0 0 11.32-11.32l-48-48a8 8 0 0 0-11.32 0l-48 48a8 8 0 0 0 11.32 11.32Z"
              />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        {/* <Select.Portal> */}
        <Select.Content class={`text-surface/90  bg-base border static!`}>
          <Select.Listbox class="py-4 max-h-[300px] overflow-y-auto" />
        </Select.Content>
        {/* </Select.Portal> */}
      </Select.Root>
    </Show>
  );
}

interface ISingleVidSelect extends ICommonSelect {
  selectOptions: customVideoSources[] | undefined;
  onValueChange: (arg: string) => void;
}
export function SingleDownloadSelect(props: ISingleVidSelect) {
  return (
    <Show when={props.selectOptions}>
      <Select.Root
        // name="downloads"
        name={props.formName}
        flip={false}
        hideWhenDetached={true}
        options={props.selectOptions}
        onValueChange={props.onValueChange}
        optionValue={(val) => String(val.size)}
        optionTextValue={(val) => `${String(bytesToMb(val.size))}`}
        placeholder={props.placeholder}
        valueComponent={(props) =>
          `${String(bytesToMb(props.item.rawValue.size))} MB`
        }
        itemComponent={(opt) => (
          <Select.Item
            item={opt.item}
            class={`text-surface  data-[selected]:text-primary/80 hover:bg-primary/20 px-2`}
          >
            <Select.ItemLabel>
              {bytesToMb(opt.item.rawValue.size)} MB
            </Select.ItemLabel>
            {/* <Select.ItemIndicator>C</Select.ItemIndicator> */}
          </Select.Item>
        )}
      >
        {/* <Select.HiddenSelect /> */}
        <Select.Trigger
          aria-label="Mp4 Quality"
          class="inline-flex items-center justify-between w-60 rounded-md py-2 pl-2 pr-4 text-surface/90 bg-surface/10 border border-surface/20 hover:border-surface/30 transition-colors duration-150"
        >
          <Select.Value class="text-ellipsis whitespace-nowrap overflow-hidden data-[placeholder-shown]:text-surface/80" />
          <Select.Icon class="text-surface/90 w-6 h-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
              viewBox="0 0 256 256"
            >
              <path
                fill="currentColor"
                d="M181.66 170.34a8 8 0 0 1 0 11.32l-48 48a8 8 0 0 1-11.32 0l-48-48a8 8 0 0 1 11.32-11.32L128 212.69l42.34-42.35a8 8 0 0 1 11.32 0Zm-96-84.68L128 43.31l42.34 42.35a8 8 0 0 0 11.32-11.32l-48-48a8 8 0 0 0-11.32 0l-48 48a8 8 0 0 0 11.32 11.32Z"
              />
            </svg>
          </Select.Icon>
        </Select.Trigger>
        {/* <Select.Portal> */}
        <Select.Content class={`text-surface/90  bg-base border`}>
          <Select.Listbox class="py-4 max-h-[300px] overflow-y-auto" />
        </Select.Content>
        {/* </Select.Portal> */}
      </Select.Root>
    </Show>
  );
}
