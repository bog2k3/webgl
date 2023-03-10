import { io, Socket } from "socket.io-client";
import { SocketMessage } from "./common/socket-message";

let socket: Socket;

export function initWebSocket(): void {
	socket = io({
		host: "localhost:3000/socket.io",
	});
	socket.send(SocketMessage.IDENTIFY, { name: "vasile" });
}
