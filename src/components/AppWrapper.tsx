import type {
  IVidWithCustom,
  i18nDictWithLangCode,
  userPreferencesI,
} from "@customTypes/types";

import {I18nProvider} from "@components/I18nWrapper";
import {VidPlayer} from "./Player";

interface IAppWrapperProps {
  locale: string;
  initialDict: i18nDictWithLangCode;
  vids: Record<string | number | symbol, IVidWithCustom[]>;
  playlist: string | undefined;
  initialData: {
    vids: IVidWithCustom[];
    chap: IVidWithCustom;
    verseRouting: string | undefined;
  };
  userPreferences: userPreferencesI | undefined;
  videojsInitalDict: Record<string, string> | undefined;
}
export function AppWrapper(props: IAppWrapperProps) {
  console.log({props});
  return (
    // <I18nProvider locale={props.locale} initialDict={props.initialDict}>
    <VidPlayer
      initialData={props.initialData}
      playlist={props.playlist}
      userPreferences={props.userPreferences}
      vids={props.vids}
      videojsInitalDict={props.videojsInitalDict}
    />
    // </I18nProvider>
  );
}
