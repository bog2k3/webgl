export enum SocketMessage {
	// Client messages
	C_IDENTIFY = "c-identify",
	C_REQ_START_CONFIG = "c-req-start-config",
	C_REQ_START_GAME = "c-req-start-game",
	C_STATE_CHANGED = "c-state-changed", // ClientState

	// Common messages
	CS_MAP_CONFIG = "cs-map-config", // map config
	CS_PLAYER_SPAWNED = "cs-player-spawned", // [CS]PlayerSpawnedDTO
	CS_ENTITY_CREATED = "cs-entity-created", // [CS]NetworkEntityCreatedDTO
	CS_ENTITY_UPDATED = "cs-entity-updated", // [CS]NetworkEntityUpdatedDTO
	CS_ENTITY_DESTROYED = "cs-entity-destroyed", // [CS]NetworkEntityDestroyedDTO

	// Server messages
	S_NAME_TAKEN = "s-name-taken",
	S_START_CONFIG_MASTER = "s-start-config-master",
	S_START_CONFIG_SLAVE = "s-start-config-slave",
	S_START_GAME = "s-start-game",
	S_PLAYER_STATE_CHANGED = "s-player-state-changed", // SPlayerInfo
	S_PLAYER_LIST = "s-player-list", // SPlayerInfo[]
	S_PLAYER_CONNECTED = "s-player-connected", // {name: string}
	S_PLAYER_DISCONNECTED = "s-player-disconnected", // {name: string}
}
