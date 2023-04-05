import { io, Socket } from "socket.io-client";
import { TerrainConfig } from "../entities/terrain/config";
import { logprefix } from "../joglfw/log";
import { Event } from "../joglfw/utils/event";
import { ClientState } from "./dto/client-state.enum";
import { SPlayerInfo } from "./dto/s-player-info.dto";
import { SocketMessage } from "./dto/socket-message";
import { CNetworkEntityCreatedDTO, SNetworkEntityCreatedDTO } from "./dto/network-entity-created.dto";
import { NetworkEntityUpdatedDTO } from "./dto/network-entity-updated.dto";
import { NetworkEntityDestroyedDTO } from "./dto/network-entity-destroyed.dto";
import { SNetworkIdResolvedDTO } from "./dto/network-id-resolved.dto";

const console = logprefix("WebSock");
let socket: Socket;

export namespace WebSock {
	export const onNameTaken = new Event<() => void>();
	export const onMapConfigReceived = new Event<(config: TerrainConfig) => void>();
	export const onStartConfig = new Event<(isMaster: boolean) => void>();
	export const onStartGame = new Event<() => void>();
	export const onPlayerConnected = new Event<(data: { name: string }) => void>();
	export const onPlayerDisconnected = new Event<(data: { name: string }) => void>();
	export const onPlayerListReceived = new Event<(list: SPlayerInfo[]) => void>();
	export const onPlayerStateChanged = new Event<(data: SPlayerInfo) => void>();
	export const onEntityCreated = new Event<(data: SNetworkEntityCreatedDTO) => void>();
	export const onEntityUpdated = new Event<(data: NetworkEntityUpdatedDTO) => void>();
	export const onEntityDestroyed = new Event<(data: NetworkEntityDestroyedDTO) => void>();
	export const onNetworkEntityIdResolved = new Event<(data: SNetworkIdResolvedDTO) => void>();

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

	export function updateState(state: ClientState): void {
		socket.send(SocketMessage.C_STATE_CHANGED, state);
	}

	export function sendEntityCreated(dto: CNetworkEntityCreatedDTO): void {
		socket.send(SocketMessage.CS_ENTITY_CREATED, dto);
	}

	export function sendEntityUpdated(dto: NetworkEntityUpdatedDTO): void {
		socket.send(SocketMessage.CS_ENTITY_UPDATED, dto);
	}

	export function sendEntityDestroyed(dto: NetworkEntityDestroyedDTO): void {
		socket.send(SocketMessage.CS_ENTITY_DESTROYED, dto);
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
		messageMap[SocketMessage.S_PLAYER_STATE_CHANGED] = (payload) => onPlayerStateChanged.trigger(payload);
		messageMap[SocketMessage.S_PLAYER_LIST] = (payload) => onPlayerListReceived.trigger(payload);
		messageMap[SocketMessage.S_NAME_TAKEN] = () => onNameTaken.trigger();
		messageMap[SocketMessage.CS_ENTITY_CREATED] = (payload) => onEntityCreated.trigger(payload);
		messageMap[SocketMessage.CS_ENTITY_UPDATED] = (payload) => onEntityUpdated.trigger(payload);
		messageMap[SocketMessage.CS_ENTITY_DESTROYED] = (payload) => onEntityDestroyed.trigger(payload);
		messageMap[SocketMessage.S_NETWORK_ID_RESOLVED] = (payload) => onNetworkEntityIdResolved.trigger(payload);
	}

	function handleMessageFromServer(message: SocketMessage, payload: any): void {
		if (!messageMap[message]) {
			console.error("Received unknown message from server: ", message);
			return;
		}
		console.debug(`[WebSock] Received ${message}: `, payload);
		messageMap[message](payload);
	}
}
