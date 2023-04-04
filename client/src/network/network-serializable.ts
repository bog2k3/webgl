export interface INetworkSerializable {
	/** Returns a (potentially empty) record of attributes to be sent over the network */
	getNWAttributes(): Record<string, any>;

	/** Updates the entity with the attributes received from the network */
	setNWAttributes(attribs: Record<string, any>): void;
}
