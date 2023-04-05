export interface INetworkSerializable {
	/** Returns a record of parameters to be sent over the network for updating the remote entity */
	getNWParameters(): Record<string, any>;

	/** Updates the local entity with the parameters received from the network */
	setNWParameters(params: Record<string, any>): void;
}
