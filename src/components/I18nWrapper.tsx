import type {i18nDictWithLangCode} from "@customTypes/types";
import {
  I18nContext,
  createI18nContext,
  createChainedI18nContext,
} from "@solid-primitives/i18n";
import type {JSX} from "solid-js";

interface i18Props {
  locale: string;
  children: JSX.Element;
  initialDict: i18nDictWithLangCode;
}
export function I18nProvider(props: i18Props) {
  // eslint-disable-next-line solid/reactivity
  const value = createI18nContext(props.initialDict, props.locale);
  return (
    <I18nContext.Provider value={value}>{props.children}</I18nContext.Provider>
  );
}
