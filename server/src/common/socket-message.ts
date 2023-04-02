export enum SocketMessage {
	// Client messages
	C_IDENTIFY = "c-identify",
	C_REQ_START_CONFIG = "c-req-start-config",
	C_REQ_START_GAME = "c-req-start-game",
	C_STATE_CHANGED = "c-state-changed", // ClientState

	// Common messages
	CS_MAP_CONFIG = "map-config", // map config
	CS_PLAYER_SPAWNED = "c-player-spawned", // CPlayerSpawnedDTO

	// Server messages
	S_START_CONFIG_MASTER = "s-start-config-master",
	S_START_CONFIG_SLAVE = "s-start-config-slave",
	S_START_GAME = "s-start-game",
	S_PLAYER_STATE_CHANGED = "s-player-state-changed", // SPlayerInfo
	S_PLAYER_LIST = "s-player-list", // SPlayerInfo[]
	S_PLAYER_CONNECTED = "s-player-connected", // {name: string}
	S_PLAYER_DISCONNECTED = "s-player-disconnected", // {name: string}
}
