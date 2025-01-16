import type {
  IVidWithCustom,
  envPropsForPlayer,
  userPreferencesI,
} from "@customTypes/types";
import {VidPlayer} from "./Player";

interface IAppWrapperProps {
  locale: string;
  initialDict: Record<string, string>;
  vids: Record<string | number | symbol, IVidWithCustom[]>;
  playlist: string | undefined;
  playlistDisplayName: string | undefined;
  initialData: {
    vids: IVidWithCustom[];
    chap: IVidWithCustom;
    verseRouting: string | undefined;
  };
  userPreferences: userPreferencesI | undefined;
  videojsInitalDict: Record<string, string> | undefined;
  playerEnv: envPropsForPlayer;
}
export function AppWrapper(props: IAppWrapperProps) {
  return (
    <VidPlayer
      initialData={props.initialData}
      playlist={props.playlist}
      playlistDisplayName={props.playlistDisplayName}
      userPreferences={props.userPreferences}
      vids={props.vids}
      videojsInitalDict={props.videojsInitalDict}
      playerEnv={props.playerEnv}
      initialDict={props.initialDict}
    />
  );
}
