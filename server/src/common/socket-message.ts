export enum SocketMessage {
	// Client messages
	C_IDENTIFY = "c-identify",
	C_REQ_START_CONFIG = "c-req-start-config",
	C_REQ_START_GAME = "c-req-start-game",

	// Common messages
	CS_MAP_CONFIG = "map-config",

	// Server messages
	S_START_CONFIG_MASTER = "s-start-config-master",
	S_START_CONFIG_SLAVE = "s-start-config-slave",
	S_START_GAME = "s-start-game",
}
