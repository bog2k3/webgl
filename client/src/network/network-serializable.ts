export interface INetworkSerializable {
	/**
	 * Returns a record of parameters to be sent over the network for updating the remote entity
	 * If options.includeInitial is true, the initial (non varying) parameters should be included
	 * for the purpose of constructing the entity. During regular updates these are skipped.
	 **/
	getNWParameters(options?: { includeInitial?: boolean }): Record<string, any>;

	/** Updates the local entity with the parameters received from the network */
	setNWParameters(params: Record<string, any>): void;
}
