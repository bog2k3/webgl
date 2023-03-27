import { Server, Socket } from "socket.io";
import * as express from "express";
import * as http from "http";
import * as cors from "cors";
import { Client } from "./client";
import { SocketMessage } from "./common/socket-message";

type BroadcastOptions = {
	except?: string; // broadcast to all sockets except the one with this id
};

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

	const allowedFiles = ["/favicon.ico", "/index.html", "/styles.css"];

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

let mapConfig: any = null;
let masterConfigurerId: string = null;

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
	if (masterConfigurerId === id || Object.keys(clients).length === 0) {
		// the master has left the chat, we promote a new client to master
		if (Object.keys(clients).length) {
			masterConfigurerId = clients[Object.keys(clients)[0]].id;
			clients[Object.keys(clients)[0]].socket.send(SocketMessage.S_START_CONFIG_MASTER);
		} else {
			masterConfigurerId = null; // no more master
			mapConfig = null; // the first player that will connect will have to configure a new map
		}
	}
}

function handleClientMessage(socket: Socket, message: string, payload: any): boolean {
	if (message === SocketMessage.C_IDENTIFY) {
		if (clients[socket.id]) {
			console.warn(`Client ${socket.id} is already identified, ignoring IDENTIFY message.`);
			return true;
		}
		addClient(socket, payload["name"]);
		return true;
	}
	if (!clients[socket.id]) {
		return false;
	}
	switch (message) {
		case SocketMessage.C_REQ_START_CONFIG:
			if (masterConfigurerId) {
				socket.send(SocketMessage.S_START_CONFIG_SLAVE);
				console.log(`${clients[socket.id].name} Request to configure denied: SLAVE`);
			} else {
				masterConfigurerId = socket.id;
				socket.send(SocketMessage.S_START_CONFIG_MASTER);
				console.log(`${clients[socket.id].name} Request to configure granted: MASTER`);
				broadcastMessage(SocketMessage.S_START_CONFIG_SLAVE, null, { except: socket.id });
			}
			break;
		case SocketMessage.CS_MAP_CONFIG:
			if (socket.id === masterConfigurerId) {
				// received config from master
				mapConfig = payload;
				broadcastMessage(SocketMessage.CS_MAP_CONFIG, mapConfig, { except: socket.id });
				console.log(`Received map config from ${clients[socket.id].name}`);
			} else {
				console.log(`Ignoring map config from non-master user ${clients[socket.id].name}`);
			}
			break;
		case SocketMessage.C_REQ_START_GAME:
			if (socket.id === masterConfigurerId) {
				broadcastMessage(SocketMessage.S_START_GAME, null);
				masterConfigurerId = null;
			} else {
				console.log(`Ignoring start request from non-master user ${clients[socket.id].name}`);
			}
			break;
	}
	return true;
}

function addClient(socket: Socket, name: string): void {
	clients[socket.id] = new Client(socket, name);
	console.log(`Client ${socket.id} identified as "${name}".`);
	// send the map config to this client
	if (mapConfig) {
		console.log(`Sending map config to ${name}`);
	} else {
		console.log(`No config to send to ${name}`);
	}
	socket.send(SocketMessage.CS_MAP_CONFIG, mapConfig);
	if (masterConfigurerId) {
		// someone is currently configuring the terrain, inform the new client
		socket.send(SocketMessage.S_START_CONFIG_SLAVE);
	} else if (mapConfig) {
		// game is in progress
		socket.send(SocketMessage.S_START_GAME);
	}
}

function broadcastMessage(message: SocketMessage, payload: any, options?: BroadcastOptions): void {
	for (let clientId in clients) {
		if (options?.except === clientId) {
			continue;
		}
		clients[clientId].socket.send(message, payload);
	}
}
