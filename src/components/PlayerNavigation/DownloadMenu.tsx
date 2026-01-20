import { DownloadRadio } from "@components/DownloadForm/DownloadRadio";
import {
	SingleDownloadSelect,
	WholeDownloadSelect,
} from "@components/DownloadForm/DownloadSelect";
import { DownloadSwitch } from "@components/DownloadForm/DownloadSwitch";
import { HiddenForm } from "@components/DownloadForm/HiddenForm";
import type { wholeBookPresets } from "@customTypes/types";
import { downloadPreference, setDownloadPreference } from "@lib/store";
import {
	currentMp4Sources,
	populateApiPayload,
	wholeBooksOptionsForSelect,
} from "@lib/UI";
import { Show } from "solid-js";

interface IDownloadMenu {
	formDataRef: HTMLFormElement | undefined;
	formName: string;
}
export function DownloadMenu(props: IDownloadMenu) {
	return (
		<>
			<form
				data-testid="download-form"
				action="/"
				name="downloadData"
				id="downloadDataForm"
				ref={props.formDataRef}
				class="flex flex-col gap-2"
			>
				<DownloadRadio
					formName={props.formName}
					defaultValue="chapter"
					onValueChange={(val) =>
						setDownloadPreference((prev) => {
							return {
								...prev,
								apiPayload: null,
								justThisVideo: val === "book" ? false : true,
							};
						})
					}
					radioLabel="Download Scope"
					radioOptions={[
						{ text: "Whole Book", value: "book" },
						{ text: "Just this video", value: "chapter" },
					]}
				/>

				<Show when={downloadPreference().justThisVideo}>
					<div class="relative z-10">
						<SingleDownloadSelect
							formName={props.formName}
							placeholder="Select video quality"
							selectOptions={currentMp4Sources()!}
							onValueChange={(val) => populateApiPayload({ type: "VID", val })}
						/>
					</div>
				</Show>

				<Show when={!downloadPreference().justThisVideo}>
					<div class="relative z-10">
						<WholeDownloadSelect
							formName={props.formName}
							placeholder="Select playlist quality"
							selectOptions={wholeBooksOptionsForSelect()!}
							onValueChange={(val: wholeBookPresets) =>
								populateApiPayload({ type: "BOOK", val })
							}
						/>
					</div>
				</Show>

				<DownloadSwitch
					formName={props.formName}
					defaultIsChecked={downloadPreference().downloadOffline}
					onCheckedChange={(isChecked) =>
						setDownloadPreference((prev) => {
							return {
								...prev,
								downloadOffline: isChecked,
							};
						})
					}
					switchLabel=" Download To Device"
				/>

				<DownloadSwitch
					formName={props.formName}
					defaultIsChecked={downloadPreference().saveToServiceWorker}
					onCheckedChange={(isChecked) =>
						setDownloadPreference((prev) => {
							return {
								...prev,
								saveToServiceWorker: isChecked,
							};
						})
					}
					switchLabel="Save offline"
				/>
			</form>
			<HiddenForm />
		</>
	);
}
