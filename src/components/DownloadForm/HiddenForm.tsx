import { downloadPreference } from "@lib/store";
import { Show } from "solid-js";

export function HiddenForm() {
	return (
		<Show
			when={
				(downloadPreference().saveToServiceWorker ||
					downloadPreference().downloadOffline) &&
				downloadPreference().apiPayload
			}
		>
			<form
				action="/api/download"
				method="post"
			>
				<input
					type="hidden"
					name="payload"
					value={JSON.stringify(downloadPreference().apiPayload)}
				/>
				<input
					type="hidden"
					name="downloadToDevice"
					value={String(downloadPreference().downloadOffline)}
				/>
				<button
					type="submit"
					class="dark:(bg-surface/10 border border-primary/60 hover:(border-primary/90 bg-surface/20)) hover:(bg-neutral-300) active:(scale-98) px-4 py-2 rounded mt-2 bg-neutral-200 border border-primary"
				>
					Submit
				</button>
			</form>
		</Show>
	);
}
