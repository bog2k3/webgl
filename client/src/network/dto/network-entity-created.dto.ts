import { Quat } from "../../joglfw/math/quat";
import { Vector } from "../../joglfw/math/vector";

interface NetworkEntityCreatedDTO {
	entityType: string;
	position: Vector;
	orientation: Quat;
	attributes: Record<string, any>;
}

export interface CNetworkEntityCreatedDTO extends NetworkEntityCreatedDTO {
	interimNetworkId: number;
}

export interface SNetworkEntityCreatedDTO extends NetworkEntityCreatedDTO {
	networkId: number;
}
