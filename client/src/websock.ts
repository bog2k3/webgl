import { io, Socket } from "socket.io-client";
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

	export function init(): void {
		socket = io({
			host: "localhost:3000/socket.io",
		});
		socket.on("message", handleMessageFromServer);
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

	function handleMessageFromServer(message: SocketMessage, payload: any): void {
		switch (message) {
			case SocketMessage.CS_MAP_CONFIG:
				onMapConfigReceived.trigger(payload);
				break;
			case SocketMessage.S_START_CONFIG_MASTER:
				onStartConfig.trigger(true);
				break;
			case SocketMessage.S_START_CONFIG_SLAVE:
				onStartConfig.trigger(false);
				break;
			case SocketMessage.S_START_GAME:
				onStartGame.trigger();
				break;
			default:
				console.error("Received unknown message from server: ", message);
		}
	}
}
