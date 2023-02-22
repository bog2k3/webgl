import { Camera } from "../camera";
import { AABB } from "../math/aabb";
import { Quat } from "../math/quat";
import { Transform } from "../math/transform";
import { Vector } from "../math/vector";
import { assert } from "../utils/assert";
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
		const up: Vector = this.getUpVector(tr.axisY());
		this.camera.lookAt(pos.add(dir), up);

		if (this.upVectorMode === UpVectorMode.FLOATING) {
			this.updateFloatingVector(dt, tr.axisY());
		}
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
		if (mode === UpVectorMode.FLOATING) {
			assert(this.attachedEntity != null, "Must attach to an entity first");
			this.floatingUpVec = this.attachedEntity.getTransform(this.attachedFrame).axisY();
			this.lastFrameUpVector = this.floatingUpVec;
			this.floatingAngVelocity = Quat.identity();
		}
	}

	// -------------------- PRIVATE AREA ----------------------------- //
	private camera: Camera;
	private attachedEntity: Entity;
	private attachedFrame: string;
	private attachOffset: Vector;
	private upVectorMode = UpVectorMode.FIXED;
	private floatingUpVec: Vector;
	private floatingAngVelocity: Quat;
	private lastFrameUpVector: Vector;

	private getUpVector(localUp: Vector): Vector {
		if (this.upVectorMode === UpVectorMode.FIXED) {
			return localUp;
		}
		if (this.upVectorMode === UpVectorMode.FREE) {
			return new Vector(0, 1, 0);
		}
		if (this.upVectorMode === UpVectorMode.FLOATING) {
			return this.floatingUpVec;
		}
	}

	private updateFloatingVector(dt: number, newFrameUpVector: Vector): void {
		// sudden changes in the attached frame's up-vector will induce some angular velocity in our up-vector.
		// when the attached frame stabilizes, our up-vector will slowly drift back to world's up.
		const joltAxis = this.lastFrameUpVector.cross(newFrameUpVector);
		this.lastFrameUpVector = newFrameUpVector;
		const axisLen = joltAxis.length();
		const angleDelta = Math.asin(axisLen);

		// angular acceleration due to jolts:
		const angVelocity = angleDelta / dt;
		const angAccel = this.computeAngularFriction(angVelocity); // this is an angular acceleration imparted by the jolt
		let qAccel = Quat.identity();
		if (axisLen > Number.EPSILON) {
			joltAxis.scaleInPlace(1.0 / axisLen); // normalize
			qAccel = Quat.axisAngle(joltAxis, angAccel);
		}

		// angular acceleration due to gravity:
		// gravity imparts an acceleration proportional to the sine of the angle between the local and world up-vectors
		const GRAVITY_FACTOR = 10;
		const tiltAngle = Math.acos(this.floatingUpVec.y);
		const tiltAccelSign = tiltAngle < Math.PI / 2 ? +1 : -1;
		const qTiltAccel = Quat.axisAngle(
			this.floatingUpVec.cross(new Vector(0, 1, 0)),
			Math.sin(tiltAngle) * tiltAccelSign * GRAVITY_FACTOR,
		);
		qAccel.combineInPlace(qTiltAccel);

		// angular acceleration due to internal friction - this is always in the opposite direction of rotation
		const frictionAccel = this.computeAngularFriction(this.floatingAngVelocity.getAngle());

		// now update parameters:
		// angle += angSpeed * dt + angAccel * dt^2/2
		// angSpeed += angAccel * dt
		this.floatingUpVec.mulQInPlace(
			this.floatingAngVelocity.scaleAngle(dt).combineInPlace(qAccel.scaleAngle((dt * dt) / 2)),
		);
		this.floatingAngVelocity.combineInPlace(qAccel.scaleAngle(dt));

		// apply internal friction:
		const crtAngSpeed = this.floatingAngVelocity.getAngle();
		const frictionAngularLoss = Math.min(frictionAccel * dt, crtAngSpeed);
		this.floatingAngVelocity.scaleAngleInPlace((crtAngSpeed - frictionAngularLoss) / crtAngSpeed);
	}

	private computeAngularFriction(angVelocity: number): number {
		const LINEAR_FACTOR = 5; //0.8;
		const SQUARE_FACTOR = 0; //0.5;
		return angVelocity * LINEAR_FACTOR + angVelocity * angVelocity * SQUARE_FACTOR;
	}
}
