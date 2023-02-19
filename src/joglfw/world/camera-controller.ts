import { Camera } from "../camera";
import { AABB } from "../math/aabb";
import { Transform } from "../math/transform";
import { Vector } from "../math/vector";
import { Entity } from "./entity";
import { StockEntityTypes } from "./stock-entity-types";
import { IUpdatable } from "./updateable";

export class CameraController extends Entity implements IUpdatable {
	constructor(target: Camera) {
		super();
		this.camera_ = target;
	}

	override getType(): string {
		return StockEntityTypes.CameraController;
	}

	override getAABB(): AABB {
		return AABB.empty();
	}

	setTargetCamera(target: Camera): void {
		this.camera_ = target;
		this.update(0);
	}

	update(dt: number): void {
		if (!this.camera_) {
			return;
		}
		if (this.attachedEntity_) {
			const tr: Transform = this.attachedEntity_.getTransform();
			const pos: Vector = this.attachOffset_.mulQ(tr.orientation()).add(tr.position());
			this.camera_.moveTo(pos);
			const dir: Vector = tr.axisZ();
			const up: Vector = tr.axisY();
			this.camera_.lookAt(pos.add(dir), up);
		}
	}

	/**
	 * Attaches the controller to the given entity; camera will follow this entity precisely, both in position and orientation.
	 * the camera is attached at <offset> from the entity's origin; <offset> is expressed in entity's local space.
	 * To detach the controller from the entity, call this again with null; the camera will remain in its last position
	 */
	attachToEntity(ent: Entity, offset: Vector): void {
		this.attachedEntity_ = ent;
		this.attachOffset_ = offset;
	}

	getAttachedEntity(): Entity {
		return this.attachedEntity_;
	}

	// -------------------- PRIVATE AREA ----------------------------- //
	private camera_: Camera;
	private attachedEntity_: Entity;
	private attachOffset_: Vector;
}
