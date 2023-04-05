import { TerrainConfig } from "./entities/terrain/config";
import { GameState } from "./game";
import { GlobalState } from "./global-state";
import { GUI } from "./gui";
import { rand, randi } from "./joglfw/utils/random";
import { WebSock } from "./network/websock";

let gameConfig: TerrainConfig = null;

export function terrainConfigReceived(cfg: TerrainConfig): void {
	if (cfg === null) {
		// the server has no config, we request to create one
		console.log(`No map config available, requesting to become master.`);
		WebSock.requestChangeConfig();
	} else {
		console.log(`Received map config from server (seed: ${cfg.seed}).`);
		gameConfig = cfg;
		GlobalState.game.updateConfig(cfg);
		GUI.updateMapParameters(cfg);
	}
}

export async function startTerrainConfig(isMaster: boolean): Promise<void> {
	await GlobalState.game.setState(GameState.CONFIGURE_TERRAIN);
	if (isMaster) {
		console.log(`[MASTER] We are master configurer.`);
		if (!gameConfig) {
			gameConfig = new TerrainConfig();
			gameConfig.seed = randi(0xffffffff);
		}
		GlobalState.game.updateConfig(gameConfig);
		WebSock.sendConfig(gameConfig);
		GUI.updateMapParameters(gameConfig);
	} else {
		console.log(`[SLAVE] Config started by another player.`);
	}
	GUI.displayView(GUI.Views.TerrainConfig, true);
	GUI.setTerrainConfigMode({ readonly: !isMaster });
	GUI.displayView(GUI.Views.Loading, false);
}

let paramTimeout = null;
export function terrainParamChanged(param: string, value: number): void {
	if (paramTimeout) {
		clearTimeout(paramTimeout);
	}
	// debounce
	paramTimeout = setTimeout(() => {
		console.log(`PARAM ${param} = ${value}`);
		switch (param) {
			case "seed":
				gameConfig.seed = value;
				break;
			case "min-elevation":
				gameConfig.minElevation = value;
				break;
			case "max-elevation":
				gameConfig.maxElevation = value;
				break;
			case "variation":
				gameConfig.variation = value;
				break;
			case "roughness":
				gameConfig.roughness = value;
				break;
		}
		WebSock.sendConfig(gameConfig);
		GlobalState.game.updateConfig(gameConfig);
	}, 300);
}

export function randomizeConfig(): void {
	if (!gameConfig) {
		return;
	}
	gameConfig.seed = randi(0xffffffff);
	gameConfig.minElevation = -10 + rand() * 9;
	gameConfig.maxElevation = 10 + rand() * 60;
	gameConfig.variation = rand();
	gameConfig.roughness = rand();
	GUI.updateMapParameters(gameConfig);
	WebSock.sendConfig(gameConfig);
	GlobalState.game.updateConfig(gameConfig);
}
