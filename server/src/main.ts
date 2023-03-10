import { Server, Socket } from "socket.io";
import * as express from "express";
import * as http from "http";
import * as cors from "cors";
import { Client } from "./client";
import { SocketMessage } from "./common/socket-message";

(function main(): void {
	const app = express();
	app.use(cors({ origin: "*" }));
	const server = http.createServer(app);
	const socketIo = new Server(server, {
		allowEIO3: true,
	});
	socketIo.on("connection", (socket) => {
		console.log("socket connected:", socket.id);
		setupSocket(socket);
	});

	const fileOptions = {
		root: "../www",
	};

	const allowedFiles = ["/favicon.ico", "/index.html"];

	app.get("/dist/*", (req, res) => {
		res.sendFile(req.url, fileOptions);
	});

	app.get("/data/*", (req, res) => {
		res.sendFile(req.url, fileOptions);
	});

	app.get("/", (req, res) => {
		res.sendFile("index.html", fileOptions);
	});

	app.get("*", (req, res) => {
		if (allowedFiles.includes(req.url)) {
			res.sendFile(req.url, fileOptions);
		} else {
			res.status(403).send("Not allowed.");
		}
	});

	server.listen(3000, () => {
		console.log("Listening on HTTP *:3000");
	});
})();

const clients: { [id: string]: Client } = {};

function setupSocket(socket: Socket): void {
	socket.on("disconnect", (reason) => {
		console.log(`socket Disconnected (${reason}):`, socket.id);
		removeClient(socket.id);
	});
	socket.on("message", (message: string, payload: any) => {
		if (!handleClientMessage(socket, message, payload)) {
			console.warn(`Ignoring message from unknown client ${socket.id}:`, message, payload);
		}
	});
}

function removeClient(id: string): void {
	delete clients[id];
}

function handleClientMessage(socket: Socket, message: string, payload: any): boolean {
	if (message === SocketMessage.IDENTIFY) {
		if (clients[socket.id]) {
			console.warn(`Client ${socket.id} is already identified, ignoring IDENTIFY message.`);
			return true;
		}
		clients[socket.id] = new Client(socket, payload["name"]);
		console.log(`Client ${socket.id} identified as "${payload["name"]}.`);
		return true;
	}
	if (!clients[socket.id]) {
		return false;
	}
}
