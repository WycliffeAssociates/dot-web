import {
  DotLogo,
  IconMajesticonsCloseLine,
  IconMenu,
  IconMoon,
  IconSun,
} from "@components/Icons";
import {
  mobileHorizontalPadding,
  handleColorSchemeChange,
  setUpThemeListener,
  updateCookiePrefByKey,
} from "@lib/UI";
import {ToggleButton} from "@kobalte/core";
import {ParentProps, Show, createSignal, onMount} from "solid-js";
import {I18nProvider} from "@components/I18nWrapper";
import type {i18nDictWithLangCode} from "@customTypes/types";
import {useI18n} from "@solid-primitives/i18n";

type HeaderProps = {
  prefersDark?: boolean | undefined;
  initialPath: string;
};
interface I18nWrapper extends ParentProps {
  locale: string;
  initialDict: i18nDictWithLangCode;
}
export function Header(props: HeaderProps & I18nWrapper) {
  return <p>No header test</p>;

  return (
    <I18nWrappedHeader locale={props.locale} initialDict={props.initialDict}>
      <HeaderInner {...props} />
    </I18nWrappedHeader>
  );
}

function I18nWrappedHeader(props: I18nWrapper) {
  return (
    <I18nProvider locale={props.locale} initialDict={props.initialDict}>
      {props.children}
    </I18nProvider>
  );
}
function HeaderInner(props: HeaderProps) {
  // eslint-disable-next-line solid/reactivity
  const [prefersDark, setPrefersDark] = createSignal(!!props.prefersDark);
  const [menuIsOpen, setMenuIsOpen] = createSignal(false);
  const [t] = useI18n();

  onMount(() => {
    const darkModeMediaQuery = setUpThemeListener(setPrefersDark);
    darkModeMediaQuery &&
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
    <div class="relative">
      <header
        class={`${mobileHorizontalPadding} py-2 flex justify-between items-center relative`}
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
          <ToggleButton.Root
            isPressed={menuIsOpen()}
            onPressedChange={(isPressed) => setMenuIsOpen(isPressed)}
          >
            <IconMenu classNames="w-8" />
          </ToggleButton.Root>
        </div>
        {/* </span> */}
      </header>
      <div class="relative overflow-hidden w-full">
        <div
          class={`min-w-[200px] z-40 bg-[#e8e8e8] absolute right-0 top-0 transform transition-250 translate-x-full p-4 h-full fixed rounded-md dark:bg-[#181817] ${
            menuIsOpen() ? "translate-x-0" : ""
          }`}
        >
          <button
            class="block ml-auto text-xl hover:(text-primary) focus:(text-primary) active:(scale-98)"
            onClick={() => setMenuIsOpen(!menuIsOpen())}
          >
            <IconMajesticonsCloseLine />
          </button>
          <Show when={props.initialPath != "/"}>
            <a class="block hover:(text-primary underline)" href="/">
              {t("homePage", undefined, "Home")}
            </a>
          </Show>
          <a class="block hover:(text-primary underline)" href="/license">
            {t("license", undefined, "License")}
          </a>
          <a class="block hover:(text-primary underline)" href="/about">
            {t("about", undefined, "About")}
          </a>
        </div>
      </div>
    </div>
  );
}
