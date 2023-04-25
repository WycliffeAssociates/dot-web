import {DotLogo, IconMenu, IconMoon, IconSun} from "@components/Icons";
import {
  getJsonFromDocCookie,
  mobileHorizontalPadding,
  setCookie,
  handleColorSchemeChange,
  setUpThemeListener,
  updateCookiePrefByKey,
} from "@lib/UI";
import {ToggleButton} from "@kobalte/core";
import {Show, createSignal, onMount} from "solid-js";
import type {userPreferencesI} from "@customTypes/types";

type HeaderProps = {
  prefersDark?: boolean | undefined;
};
export function Header(props: HeaderProps) {
  const [prefersDark, setPrefersDark] = createSignal(!!props.prefersDark);

  onMount(() => {
    const darkModeMediaQuery = setUpThemeListener(setPrefersDark);
    darkModeMediaQuery.addEventListener("change", (e) =>
      handleColorSchemeChange(e, setPrefersDark)
    );
  });

  function handleThemeToggle(prefersDark: boolean) {
    const htmlElement = document.querySelector("html") as HTMLHtmlElement;
    setPrefersDark(prefersDark);
    if (!prefersDark) {
      htmlElement.classList.remove("dark");
      htmlElement.classList.add("light");
    } else {
      htmlElement.classList.add("dark");
      htmlElement.classList.remove("light");
    }
    updateCookiePrefByKey("prefersDark", prefersDark);
  }

  return (
    <header
      class={`${mobileHorizontalPadding} py-2 flex justify-between items-center`}
    >
      {/* <span class="w-16"> */}
      <span class="w-32">
        <DotLogo />
      </span>
      <div class="flex gap-2">
        <ToggleButton.Root
          class="toggle-button"
          aria-label="Light Mode or Dark Mode"
          isPressed={prefersDark()}
          onPressedChange={(isPressed) => handleThemeToggle(isPressed)}
        >
          <Show when={prefersDark()} fallback={<IconMoon />}>
            <IconSun />
          </Show>
        </ToggleButton.Root>
        <IconMenu classNames="w-8" />
      </div>
      {/* </span> */}
    </header>
  );
}
