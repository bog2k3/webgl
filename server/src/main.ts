import * as cors from "cors";
import * as express from "express";
import * as http from "http";
import { Server, Socket } from "socket.io";
import { Client, ClientState } from "./client";
import { CNetworkEntityCreatedDTO, SNetworkEntityCreatedDTO } from "./dto/network-entity-created.dto";
import { SNetworkIdResolvedDTO } from "./dto/network-id-resolved.dto";
import { SPlayerInfo } from "./dto/s-player-info.dto";
import { SocketMessage } from "./dto/socket-message";

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
const messageHandlers: { [msg in SocketMessage]?: (socket: Socket, payload: any) => void } = {};

let mapConfig: any = null;
let masterConfigurerId: string = null;

function setupSocket(socket: Socket): void {
	socket.on("disconnect", (reason) => {
		console.log(`socket Disconnected (${reason}):`, socket.id);
		removeClient(socket.id);
	});
	socket.on("message", (message: string, payload: any) => {
		if (!handleClientMessage(socket, message, payload)) {
			console.warn(`Ignoring message from client ${socket.id}:`, message, payload);
		}
	});
	messageHandlers[SocketMessage.C_REQ_START_CONFIG] = handleReqStartConfig;
	messageHandlers[SocketMessage.CS_MAP_CONFIG] = handleMapConfig;
	messageHandlers[SocketMessage.C_REQ_START_GAME] = handleReqStartGame;
	messageHandlers[SocketMessage.C_STATE_CHANGED] = handlePlayerStateChanged;
	messageHandlers[SocketMessage.CS_ENTITY_CREATED] = handleEntityCreated;
	messageHandlers[SocketMessage.CS_ENTITY_UPDATED] = handleEntityUpdated;
	messageHandlers[SocketMessage.CS_ENTITY_DESTROYED] = handleEntityDestroyed;
}

function broadcastMessage(message: SocketMessage, payload: any, options?: BroadcastOptions): void {
	for (let clientId in clients) {
		if (options?.except === clientId) {
			continue;
		}
		clients[clientId].socket.send(message, payload);
	}
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
	socket.send(SocketMessage.S_PLAYER_LIST, buildPlayerList());
	if (masterConfigurerId) {
		// someone is currently configuring the terrain, inform the new client
		socket.send(SocketMessage.S_START_CONFIG_SLAVE);
	} else if (mapConfig) {
		// game is in progress
		socket.send(SocketMessage.S_START_GAME);
	}
	broadcastMessage(SocketMessage.S_PLAYER_CONNECTED, { name }, { except: socket.id });
}

function removeClient(id: string): void {
	if (!clients[id]) {
		return;
	}
	broadcastMessage(SocketMessage.S_PLAYER_DISCONNECTED, { name: clients[id].name }, { except: id });
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

function buildPlayerList(): SPlayerInfo[] {
	return Object.keys(clients).map((sockId) => ({
		name: clients[sockId].name,
		state: clients[sockId].state,
	}));
}

function handleClientMessage(socket: Socket, message: string, payload: any): boolean {
	if (message === SocketMessage.C_IDENTIFY) {
		if (clients[socket.id]) {
			console.warn(`Client ${socket.id} is already identified, ignoring IDENTIFY message.`);
			return true;
		}
		if (clientNameExists(payload["name"])) {
			socket.send(SocketMessage.S_NAME_TAKEN);
		} else {
			addClient(socket, payload["name"]);
		}
		return true;
	}
	if (!clients[socket.id]) {
		console.error(`Received message from unknown client: ${socket.id}`);
		return false;
	}
	if (!messageHandlers[message]) {
		console.error(`No handler registered for message "${message}"`);
		return false;
	}
	messageHandlers[message](socket, payload);
	return true;
}

function clientNameExists(name: string): boolean {
	for (let sockId in clients) {
		if (clients[sockId].name === name) {
			return true;
		}
	}
	return false;
}

// ----------------------- MESSAGE HANDLERS BELOW ---------------------------------- //

function handleReqStartConfig(socket: Socket, payload: never): void {
	if (masterConfigurerId) {
		socket.send(SocketMessage.S_START_CONFIG_SLAVE);
		console.log(`${clients[socket.id].name} Request to configure denied: SLAVE`);
	} else {
		masterConfigurerId = socket.id;
		socket.send(SocketMessage.S_START_CONFIG_MASTER);
		console.log(`${clients[socket.id].name} Request to configure granted: MASTER`);
		if (mapConfig) {
			console.log(`Game stopped by ${clients[socket.id].name}`);
		}
		broadcastMessage(SocketMessage.S_START_CONFIG_SLAVE, null, { except: socket.id });
	}
}

function handleMapConfig(socket: Socket, payload: any): void {
	if (socket.id === masterConfigurerId) {
		// received config from master
		mapConfig = payload;
		broadcastMessage(SocketMessage.CS_MAP_CONFIG, mapConfig, { except: socket.id });
		console.log(`Received map config from ${clients[socket.id].name}`);
	} else {
		console.log(`Ignoring map config from non-master user ${clients[socket.id].name}`);
	}
}

function handleReqStartGame(socket: Socket, payload: never): void {
	if (socket.id === masterConfigurerId) {
		broadcastMessage(SocketMessage.S_START_GAME, null);
		masterConfigurerId = null;
		console.log(`Game started by ${clients[socket.id].name}.`);
	} else {
		console.log(`Ignoring start request from non-master user ${clients[socket.id].name}`);
	}
}

function handlePlayerStateChanged(socket: Socket, payload: ClientState): void {
	let actionString: string;
	switch (payload) {
		case ClientState.LOBBY:
			actionString = "exited to lobby";
			break;
		case ClientState.SPECTATE:
			actionString =
				clients[socket.id].state === ClientState.LOBBY ? "joined as spectator" : "started spectating";
			break;
		case ClientState.PLAY:
			actionString = "joined as player";
			break;
	}
	clients[socket.id].state = payload;
	console.log(`${clients[socket.id].name} ${actionString}.`);
	broadcastMessage(SocketMessage.S_PLAYER_STATE_CHANGED, <SPlayerInfo>{
		name: clients[socket.id].name,
		state: payload,
	});
}

let nextNetworkEntityId = 1;
function handleEntityCreated(socket: Socket, payload: CNetworkEntityCreatedDTO): void {
	const networkId: number = nextNetworkEntityId++;
	socket.send(SocketMessage.S_NETWORK_ID_RESOLVED, <SNetworkIdResolvedDTO>{
		interimId: payload.interimNetworkId,
		resolvedId: networkId,
	});
	delete payload.interimNetworkId;
	const sPayload: SNetworkEntityCreatedDTO = payload as unknown as SNetworkEntityCreatedDTO;
	sPayload.networkId = networkId;
	broadcastMessage(SocketMessage.CS_ENTITY_CREATED, sPayload, { except: socket.id });
}

function handleEntityUpdated(socket: Socket, payload: any): void {
	broadcastMessage(SocketMessage.CS_ENTITY_UPDATED, payload, { except: socket.id });
}

function handleEntityDestroyed(socket: Socket, payload: any): void {
	broadcastMessage(SocketMessage.CS_ENTITY_DESTROYED, payload, { except: socket.id });
}
