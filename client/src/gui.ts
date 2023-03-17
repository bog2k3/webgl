import { Event } from "./joglfw/utils/event";

export namespace GUI {
	export enum Views {
		PlayerNameDialog,
	}

	const viewHandles: { [key in Views]?: HTMLElement } = {};

	export const onPlayerName = new Event<(name: string) => void>();

	export function init(): void {
		setupViews();
	}

	export function displayView(view: Views, show: boolean): void {
		viewHandles[view].style.display = show ? "" : "none";
	}

	// -------------------------------------------- PRIVATE AREA ----------------------------------------------- //

	function setupViews(): void {
		viewHandles[Views.PlayerNameDialog] = document.getElementById("dialog-player-name");
		document.getElementById("btn-confirm-name").onclick = handlePlayerName;
		document.getElementById("player-name").onkeydown = triggerButton.bind(null, "btn-confirm-name");
	}

	function triggerButton(buttonId: string, event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			document.getElementById(buttonId).click();
		}
	}

	function handlePlayerName(): void {
		const name: string = document.getElementById("player-name")["value"];
		onPlayerName.trigger(name);
	}
}
