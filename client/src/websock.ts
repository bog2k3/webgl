import { io, Socket } from "socket.io-client";
import { SPlayerInfo } from "./common/s-player-info.dto";
import { SPlayerSpawnedDTO } from "./common/s-player-spawned.dto";
import { SocketMessage } from "./common/socket-message";
import { TerrainConfig } from "./entities/terrain/config";
import { logprefix } from "./joglfw/log";
import { Event } from "./joglfw/utils/event";

const console = logprefix("WebSock");
let socket: Socket;

export namespace WebSock {
	export const onMapConfigReceived = new Event<(config: TerrainConfig) => void>();
	export const onStartConfig = new Event<(isMaster: boolean) => void>();
	export const onStartGame = new Event<() => void>();
	export const onPlayerConnected = new Event<(data: { name: string }) => void>();
	export const onPlayerDisconnected = new Event<(data: { name: string }) => void>();
	export const onPlayerSpawned = new Event<(data: SPlayerSpawnedDTO) => void>();
	export const onPlayerListReceived = new Event<(list: SPlayerInfo[]) => void>();
	export const onPlayerStateChanged = new Event<(data: SPlayerInfo) => void>();

	export function init(): void {
		socket = io({
			host: "localhost:3000/socket.io",
		});
		socket.on("message", handleMessageFromServer);
		initMessageMap();
	}

	export function authenticate(name: string): void {
		socket.send(SocketMessage.C_IDENTIFY, { name });
	}

	/**
	 * Asks the server to become the master configurer for the map.
	 * The server will respond with one of START_CONFIG_[MASTER/SLAVE]
	 */
	export function requestChangeConfig(): void {
		socket.send(SocketMessage.C_REQ_START_CONFIG);
	}

	export function requestStartGame(): void {
		socket.send(SocketMessage.C_REQ_START_GAME);
	}

	export function sendConfig(cfg: any): void {
		socket.send(SocketMessage.CS_MAP_CONFIG, cfg);
		console.log(`Sent map config to server (seed: ${cfg.seed})`);
	}

	// -------------------------------------------- PRIVATE AREA ----------------------------------------------- //

	const messageMap: { [key in SocketMessage]?: (payload: any) => void } = {};

	function initMessageMap(): void {
		messageMap[SocketMessage.CS_MAP_CONFIG] = (payload) => onMapConfigReceived.trigger(payload);
		messageMap[SocketMessage.S_START_CONFIG_MASTER] = () => onStartConfig.trigger(true);
		messageMap[SocketMessage.S_START_CONFIG_SLAVE] = () => onStartConfig.trigger(false);
		messageMap[SocketMessage.S_START_GAME] = () => onStartGame.trigger();
		messageMap[SocketMessage.S_PLAYER_CONNECTED] = (payload) => onPlayerConnected.trigger(payload);
		messageMap[SocketMessage.S_PLAYER_DISCONNECTED] = (payload) => onPlayerDisconnected.trigger(payload);
		messageMap[SocketMessage.CS_PLAYER_SPAWNED] = (payload) => onPlayerSpawned.trigger(payload);
		messageMap[SocketMessage.S_PLAYER_STATE_CHANGED] = (payload) => onPlayerStateChanged.trigger(payload);
		messageMap[SocketMessage.S_PLAYER_LIST] = (payload) => onPlayerListReceived.trigger(payload);
	}

	function handleMessageFromServer(message: SocketMessage, payload: any): void {
		if (!messageMap[message]) {
			console.error("Received unknown message from server: ", message);
			return;
		}
		messageMap[message](payload);
	}
}
