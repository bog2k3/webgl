import { io, Socket } from "socket.io-client";
import { SocketMessage } from "./common/socket-message";
import { TerrainConfig } from "./entities/terrain/config";
import { Event } from "./joglfw/utils/event";

let socket: Socket;

export namespace WebSock {
	export const onMapConfigReceived = new Event<(config: TerrainConfig) => void>();

	export function init(): void {
		socket = io({
			host: "localhost:3000/socket.io",
		});
		socket.on("message", handleMessageFromServer);
	}

	export function authenticate(name: string): void {
		socket.send(SocketMessage.IDENTIFY, { name });
	}

	// -------------------------------------------- PRIVATE AREA ----------------------------------------------- //

	function handleMessageFromServer(message: SocketMessage, payload: any): void {
		switch (message) {
			case SocketMessage.MAP_CONFIG:
				onMapConfigReceived.trigger(payload);
				break;
			default:
				console.error("Received unknown message from server: ", message);
		}
	}
}
