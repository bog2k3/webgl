import { Camera } from "../camera";
import { AABB } from "../math/aabb";
import { Transform } from "../math/transform";
import { Vector } from "../math/vector";
import { Entity } from "./entity";
import { StockEntityTypes } from "./stock-entity-types";
import { IUpdatable } from "./updateable";

export enum UpVectorMode {
	FIXED,
	FREE,
	FLOATING,
}
export class CameraController extends Entity implements IUpdatable {
	constructor(target: Camera) {
		super();
		this.camera = target;
	}

	override getType(): string {
		return StockEntityTypes.CameraController;
	}

	override getAABB(): AABB {
		return AABB.empty();
	}

	setTargetCamera(target: Camera): void {
		this.camera = target;
		this.update(0);
	}

	update(dt: number): void {
		if (!this.camera || !this.attachedEntity) {
			return;
		}
		const tr: Transform = this.attachedEntity.getTransform(this.attachedFrame);
		const pos: Vector = this.attachOffset.mulQ(tr.orientation()).add(tr.position());
		this.camera.moveTo(pos);
		const dir: Vector = tr.axisZ();
		const up: Vector = this.getUpVector(tr.axisY(), dt);
		this.camera.lookAt(pos.add(dir), up);
	}

	/**
	 * Attaches the controller to the given entity's frame.
	 * The camera will follow this entity's frame in terms of position and orientation.
	 * the camera is attached at <offset> from the frame's origin; <offset> is expressed in the frame's local space.
	 * To detach the controller from the entity, call this again with null; the camera will remain in its last position.
	 */
	attachToEntity(ent: Entity | null, frameName = "root", offset = new Vector(0)): void {
		this.attachedEntity = ent;
		this.attachedFrame = frameName;
		this.attachOffset = offset;
	}

	getAttachedEntity(): Entity {
		return this.attachedEntity;
	}

	/**
	 * Sets the way the camer's up-vector will be affected by the attached frame.
	 * *FIXED* will set the camera's up-vector the same as the attached frame's in a rigid way.
	 * *FREE* the camera's up-vector is the same as the world's, and not affected by the attachment.
	 * *FLOATING* the camera behaves like a floating compass - quick jolts of the attachment will produce
	 * some roll but the camera eventually returns to the world's up-vector.
	 */
	setUpVectorMode(mode: UpVectorMode): void {
		this.upVectorMode = mode;
	}

	// -------------------- PRIVATE AREA ----------------------------- //
	private camera: Camera;
	private attachedEntity: Entity;
	private attachedFrame: string;
	private attachOffset: Vector;
	private upVectorMode = UpVectorMode.FIXED;

	private getUpVector(localUp: Vector, dt: number): Vector {
		if (this.upVectorMode === UpVectorMode.FIXED) {
			return localUp;
		}
		if (this.upVectorMode === UpVectorMode.FREE) {
			return new Vector(0, 1, 0);
		}
		if (this.upVectorMode === UpVectorMode.FLOATING) {
			return localUp; // TODO
		}
	}
}
