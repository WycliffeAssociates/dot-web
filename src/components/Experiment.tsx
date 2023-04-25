import {For} from "solid-js";
import {Select, Switch, RadioGroup, Button} from "@kobalte/core";

const currentMp4Sources = () => {
  return [
    {value: "apple", label: "Apple", disabled: false, size: 100},
    {value: "banana", label: "Banana", disabled: false, size: 200},
    {value: "blueberry", label: "Blueberry", disabled: false, size: 300},
    {value: "grapes", label: "Grapes", disabled: true, size: 400},
    {value: "pineapple", label: "Pineapple", disabled: false, size: 500},
  ];
};
export function SelectDev() {
  return (
    <Select.Root
      flip={false}
      hideWhenDetached={true}
      name="fruit"
      options={currentMp4Sources()}
      optionValue="size"
      optionTextValue={(val) => String(val.size)}
      placeholder="Select mp4 quality"
      valueComponent={(props) => props.item.rawValue.size}
      itemComponent={(props) => (
        <Select.Item
          item={props.item}
          class={`text-surface  data-[selected]:text-primary/80 hover:bg-primary/20 px-2`}
        >
          <Select.ItemLabel>{props.item.rawValue.size} mb</Select.ItemLabel>
          {/* <Select.ItemIndicator>C</Select.ItemIndicator> */}
        </Select.Item>
      )}
    >
      <Select.HiddenSelect />
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
      <Select.Portal>
        <Select.Content class={`text-surface/90  bg-base border`}>
          <Select.Listbox class="py-4 max-h-[300px] overflow-y-auto" />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
export function SwitchDev() {
  return (
    <Switch.Root class="switch">
      <Switch.Label class="switch__label">Download To Device</Switch.Label>
      <Switch.Input class="switch__input" />
      <Switch.Control class="w-12 h-6 rounded-full bg-surface/20 grid place-content-center relative p-2 relative data-[checked]:(bg-primary/30)">
        <Switch.Thumb class="rounded-full h-full w-1/2 absolute left-0 bg-surface/10 transition duration-150 data-[checked]:text-primary/80 data-[checked]:(translate-x-100% bg-primary)" />
      </Switch.Control>
    </Switch.Root>
  );
}
export function RadioDev() {
  return (
    <RadioGroup.Root class="radio-group">
      <RadioGroup.Label class="radio-group__label">
        Download Scope
      </RadioGroup.Label>
      <div class="">
        <For each={["Whole Book", "This Chapter"]}>
          {(fruit) => (
            <RadioGroup.Item value={fruit} class="flex gap-2">
              <RadioGroup.ItemInput class="radio__input" />
              <RadioGroup.ItemControl class="w-6 h-6 rounded-full bg-surface/20 grid place-content-center relative p-2">
                <RadioGroup.ItemIndicator class="absolute w-3/5 h-3/5 inset-20% rounded-full block bg-primary" />
              </RadioGroup.ItemControl>
              <RadioGroup.ItemLabel class="radio__label">
                {fruit}
              </RadioGroup.ItemLabel>
            </RadioGroup.Item>
          )}
        </For>
      </div>
    </RadioGroup.Root>
  );
}
export function ButtonDev() {
  return (
    <Button.Root
      class={`rounded-full h-8 w-8 inline-grid place-content-center text-center flex-shrink-0 bg-neutral-400 dark:bg-neutral-600 text-white sm:(w-12 h-12) hover:(bg-primary/70 transition scale-110) active:(scale-95) `}
    >
      Click me
    </Button.Root>
  );
}
