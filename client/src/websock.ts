import { io, Socket } from "socket.io-client";
import { SocketMessage } from "./common/socket-message";

let socket: Socket;

export namespace WebSock {
	export function init(): void {
		socket = io({
			host: "localhost:3000/socket.io",
		});
	}

	export function authenticate(name: string): void {
		socket.send(SocketMessage.IDENTIFY, { name: "vasile" });
	}
}
