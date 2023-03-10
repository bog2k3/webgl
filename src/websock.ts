import { io, Socket } from "socket.io-client";

let socket: Socket;

export function initWebSocket(): void {
	socket = io({
		host: "localhost:3000/socket.io",
	});
	socket.send("hello");
}
