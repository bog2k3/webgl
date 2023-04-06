import { Game } from "./game";
import { HtmlInputHandler } from "./input";
import { World } from "./joglfw/world/world";
import { NetworkEntityManager } from "./network/network-entity-manager";
import { PlayerList } from "./player-list";
import { RenderData } from "./render/render-data";

export namespace GlobalState {
	export let renderData: RenderData;
	export let world: World;
	export let game: Game;
	export let inputHandler: HtmlInputHandler;
	export let isPaused = false;
	export let playerList = new PlayerList();
	export let networkManager: NetworkEntityManager;
}
