import { assert } from "../joglfw/utils/assert";
import { Entity } from "../joglfw/world/entity";
import { IUpdatable } from "../joglfw/world/updateable";
import { World } from "../joglfw/world/world";
import { WebSock } from "./websock";
import { CNetworkEntityCreatedDTO, SNetworkEntityCreatedDTO } from "./dto/network-entity-created.dto";
import { NetworkEntityDestroyedDTO } from "./dto/network-entity-destroyed.dto";
import { NetworkEntityUpdatedDTO } from "./dto/network-entity-updated.dto";
import { INetworkSerializable } from "./network-serializable";
import { SNetworkIdResolvedDTO } from "./dto/network-id-resolved.dto";

const NETWORK_UPDATE_TIME = 0.1; // sec

export class NetworkEntityManager implements IUpdatable {
	constructor() {
		this.setupHandlers();
	}

	addEntityFactory(entType: string, factoryFn: (params: Record<string, any>) => Entity & INetworkSerializable): void {
		this.entityFactory[entType] = factoryFn;
	}

	update(dt: number): void {
		for (let w of this.localEntities) {
			w.updateTimer += dt;
			if (w.updateTimer > NETWORK_UPDATE_TIME) {
				w.updateTimer -= NETWORK_UPDATE_TIME;
				this.sendLocalEntityUpdate(w.entity, w.networkId);
			}
		}
	}

	addLocalEntity(ent: Entity & INetworkSerializable): void {
		const wrapper = new LocalEntityWrapper(ent);
		this.sendLocalEntityCreated(ent).then((networkId: number) => {
			wrapper.networkId = networkId;
			this.localEntities.push(wrapper);
		});
	}

	removeLocalEntity(ent: Entity & INetworkSerializable): void {
		const index: number = this.localEntities.findIndex((w) => w.entity === ent);
		this.sendLocalEntityDestroyed(ent, this.localEntities[index].networkId);
		this.localEntities.splice(index, 1);
	}

	// ----------------------------- PRIVATE AREA ----------------------------------- //

	nextInterimNetworkId = 1;
	localEntities: LocalEntityWrapper[] = [];
	remoteEntities: { [networkId: number]: Entity & INetworkSerializable } = {};
	pendingIdResolution: { [interimId: number]: (number) => void } = {};
	entityFactory: { [entityType: string]: (params: Record<string, any>) => Entity & INetworkSerializable } = {};

	setupHandlers(): void {
		WebSock.onEntityCreated.add((payload) => this.addNetworkEntity(payload));
		WebSock.onEntityUpdated.add((payload) => this.updateNetworkEntity(payload));
		WebSock.onEntityDestroyed.add((payload) => this.removeNetworkEntity(payload));
		WebSock.onNetworkEntityIdResolved.add((payload) => this.resolveNetworkId(payload));
	}

	resolveNetworkId(data: SNetworkIdResolvedDTO): void {
		if (!this.pendingIdResolution[data.interimId]) {
			console.warn(`Received network entity id resolution for unknown interimId: ${data.interimId}.`);
			return;
		}
		this.pendingIdResolution[data.interimId](data.resolvedId);
		delete this.pendingIdResolution[data.interimId];
	}

	addNetworkEntity(data: SNetworkEntityCreatedDTO): void {
		if (!this.entityFactory[data.entityType]) {
			throw new Error(`No known factory for entity type "${data.entityType}"`);
		}
		const ent: Entity & INetworkSerializable = this.entityFactory[data.entityType](data.parameters);
		assert(
			ent.getType() === data.entityType,
			`Wrong entity type (${ent.getType()}) created by factory for "${data.entityType}"`,
		);
		this.remoteEntities[data.networkId] = ent;
		World.getInstance().addEntity(ent);
	}

	updateNetworkEntity(data: NetworkEntityUpdatedDTO): void {
		if (!this.remoteEntities[data.networkId]) {
			console.warn(`Received update for unknown network entity with id ${data.networkId}.`);
			return;
		}
		this.remoteEntities[data.networkId].setNWParameters(data.parameters);
	}

	removeNetworkEntity(data: NetworkEntityDestroyedDTO): void {
		if (!this.remoteEntities[data.networkId]) {
			console.warn(`Received remove for unknown network entity with id ${data.networkId}.`);
			return;
		}
		this.remoteEntities[data.networkId].setNWParameters(data.parameters);
		this.remoteEntities[data.networkId].destroy();
		delete this.remoteEntities[data.networkId];
	}

	/** @returns the networkId generated by the server for the entity */
	sendLocalEntityCreated(ent: Entity & INetworkSerializable): Promise<number> {
		return new Promise((resolve) => {
			const interimId = this.nextInterimNetworkId;
			this.pendingIdResolution[this.nextInterimNetworkId++] = resolve;
			WebSock.sendEntityCreated(<CNetworkEntityCreatedDTO>{
				interimNetworkId: interimId,
				entityType: ent.getType(),
				parameters: ent.getNWParameters({ includeInitial: true }),
			});
		});
	}

	sendLocalEntityUpdate(ent: INetworkSerializable, networkId: number): void {
		WebSock.sendEntityUpdated(<NetworkEntityUpdatedDTO>{
			networkId,
			parameters: ent.getNWParameters(),
		});
	}

	sendLocalEntityDestroyed(ent: INetworkSerializable, networkId: number): void {
		WebSock.sendEntityDestroyed(<NetworkEntityDestroyedDTO>{
			networkId,
			parameters: ent.getNWParameters(),
		});
	}
}

class LocalEntityWrapper {
	entity: Entity & INetworkSerializable;
	networkId: number;
	updateTimer = 0;

	constructor(ent: Entity & INetworkSerializable) {
		this.entity = ent;
	}
}
