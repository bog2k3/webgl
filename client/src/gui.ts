import * as $ from "jquery";
import { TerrainConfig } from "./entities/terrain/config";
import { Event } from "./joglfw/utils/event";
import { randi } from "./joglfw/utils/random";

export namespace GUI {
	export enum Views {
		PlayerNameDialog,
		TerrainConfig,
	}

	const viewHandles: { [key in Views]?: JQuery<HTMLElement> } = {};

	export const onPlayerName = new Event<(name: string) => void>();
	export const onParameterChanged = new Event<(param: string, value: number) => void>();
	export const onRandomizeAll = new Event<() => void>();
	export const onStartGame = new Event<() => void>();

	export function init(): void {
		setupViews();
	}

	export function displayView(view: Views, show: boolean): void {
		if (show) {
			viewHandles[view].addClass("show");
		} else {
			viewHandles[view].removeClass("show");
		}
	}

	export function setTerrainConfigMode(mode: { readonly: boolean }): void {
		if (mode.readonly) {
			// slave mode
			$(".master-only").css("display", "none");
			$(".slave-only").css("display", "initial");
			$("#seed").attr("readonly", "true");
			$("#random-seed").attr("disabled", "true");
			enableSlider("min-elevation", false);
			enableSlider("max-elevation", false);
			enableSlider("variation", false);
			enableSlider("roughness", false);
		} else {
			// master mode
			$(".master-only").css("display", "initial");
			$(".slave-only").css("display", "none");
			$("#seed").removeAttr("readonly");
			$("#random-seed").removeAttr("disabled");
			enableSlider("min-elevation", true);
			enableSlider("max-elevation", true);
			enableSlider("variation", true);
			enableSlider("roughness", true);
		}
	}

	export function updateMapParameters(cfg: TerrainConfig): void {
		$("#seed").val(cfg.seed);
		$("#min-elevation").val(cfg.minElevation);
		$("#max-elevation").val(cfg.maxElevation);
		$("#variation").val(cfg.variation);
		$("#roughness").val(cfg.roughness);
	}

	// -------------------------------------------- PRIVATE AREA ----------------------------------------------- //

	function setupViews(): void {
		viewHandles[Views.PlayerNameDialog] = $("#dialog-player-name");
		viewHandles[Views.TerrainConfig] = $("#terrain-config-panel");
		$("#btn-confirm-name").on("click", handlePlayerName);
		$("#player-name").on("keydown", triggerButton.bind(null, "btn-confirm-name"));
		$("#random-seed").on("click", handleRandomSeed);
		$("#seed").on("change", handleSeedChanged);
		$("#min-elevation").on("input", handleMinElevationChanged);
		$("#max-elevation").on("input", handleMaxElevationChanged);
		$("#variation").on("input", handleVariationChanged);
		$("#roughness").on("input", handleRoughnessChanged);
		$("#randomize-all").on("click", () => onRandomizeAll.trigger());
		$("#start-game").on("click", () => onStartGame.trigger());
	}

	function triggerButton(buttonId: string, event: KeyboardEvent): void {
		if (event.key === "Enter") {
			event.preventDefault();
			$(`#${buttonId}`).trigger("click");
		}
	}

	function handlePlayerName(): void {
		const name: string = $("#player-name").val() as string;
		onPlayerName.trigger(name);
	}

	function enableSlider(id: string, enabled: boolean): void {
		if (enabled) {
			$(`#${id}`).removeAttr("disabled");
		} else {
			$(`#${id}`).attr("disabled", "true");
		}
	}

	function handleRandomSeed(): void {
		const newSeed = randi(0xffffffff);
		$("#seed").val(newSeed);
		onParameterChanged.trigger("seed", newSeed);
	}

	function handleSeedChanged(): void {
		onParameterChanged.trigger("seed", Number.parseFloat($("#seed").val() as string));
	}

	function handleMinElevationChanged(): void {
		onParameterChanged.trigger("min-elevation", Number.parseFloat($("#min-elevation").val() as string));
	}

	function handleMaxElevationChanged(): void {
		onParameterChanged.trigger("max-elevation", Number.parseFloat($("#max-elevation").val() as string));
	}

	function handleVariationChanged(): void {
		onParameterChanged.trigger("variation", Number.parseFloat($("#variation").val() as string));
	}

	function handleRoughnessChanged(): void {
		onParameterChanged.trigger("roughness", Number.parseFloat($("#roughness").val() as string));
	}
}
