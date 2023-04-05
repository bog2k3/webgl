type NetworkEntityCreatedDTO = {
	entityType: string;
	parameters: Record<string, any>;
};

export type CNetworkEntityCreatedDTO = NetworkEntityCreatedDTO & {
	interimNetworkId: number;
};

export type SNetworkEntityCreatedDTO = NetworkEntityCreatedDTO & {
	networkId: number;
};
