import Ammo from "ammojs-typed";
import { Quat } from "../joglfw/math/quat";
import { Transform } from "../joglfw/math/transform";
import { Vector } from "../joglfw/math/vector";
import { assert } from "../joglfw/utils/assert";
import { Event } from "../joglfw/utils/event";
import { Entity } from "../joglfw/world/entity";
import { bullet2Quat, bullet2Vec, quat2Bullet, vec2Bullet } from "./functions";
import { physWorld } from "./physics";

export class ContactPoint {
	worldPointOnThis: Vector;
	worldPointOnOther: Vector;
	//worldNormalOnOther: Vector;
}

export class CollisionEvent {
	thisObj: Ammo.btCollisionObject;
	otherObj: Ammo.btCollisionObject;
	thisMeta: PhysBodyProxy;
	otherMeta: PhysBodyProxy;
	static readonly maxNumberContacts = 4;
	contacts: ContactPoint[];
}

// construction config for physics body
export class PhysBodyConfig {
	shape: Ammo.btCollisionShape;
	mass = 1.0;
	friction = 0.5;
	position = new Vector(0);
	orientation = Quat.identity();
	/** initial velocity in m/s expressed in world space */
	initialVelocity = new Vector(0);
	/** initial angular velocity in rad/s expressed in world space */
	initialAngularVelocity = Quat.identity();

	/** The group to which this shape belongs */
	collisionGroup = 0;
	/** A mask to enable collisions only for overlapping groups. Zero enables for all */
	collisionMask = 0xffffffff;

	customInertia?: Ammo.btVector3;

	constructor(data?: Partial<PhysBodyConfig>) {
		if (data) {
			for (let key in data) {
				if (data[key] !== undefined) {
					this[key] = data[key];
				}
			}
		}
	}
}

// every btCollisionObject in the world has a userPointer to this class:
export class PhysBodyProxy {
	constructor(public readonly entity: Entity) {
		this.entityType = entity ? entity.getType() : null;
	}

	/**
	 * This will remove the body from the physics world,
	 * delete the body, delete the motion_state and release the shape.
	 */
	destroy(): void {
		if (this.body) {
			physWorld.removeRigidBody(this.body);
			this.body = null;
			this.motionState = null;
		}
	}

	/**
	 * Helper function to create the physics body.
	 * This will automatically add the body to the physics world.
	 */
	createBody(cfg: PhysBodyConfig): void {
		assert(cfg.shape != null);
		assert(cfg.mass >= 0);
		let inertia = cfg.customInertia;
		if (!inertia) {
			inertia = new Ammo.btVector3();
			cfg.shape.calculateLocalInertia(cfg.mass, inertia);
		}

		const vPos: Ammo.btVector3 = vec2Bullet(cfg.position);
		const qOrient: Ammo.btQuaternion = quat2Bullet(cfg.orientation);
		this.motionState = new Ammo.btDefaultMotionState(new Ammo.btTransform(qOrient, vPos));
		const cinfo = new Ammo.btRigidBodyConstructionInfo(cfg.mass, this.motionState, cfg.shape, inertia);
		cinfo.set_m_friction(cfg.friction);

		this.body = new Ammo.btRigidBody(cinfo);
		this.body.setUserPointer(this);
		this.body.setLinearVelocity(vec2Bullet(cfg.initialVelocity));
		this.body.setAngularVelocity(vec2Bullet(cfg.initialAngularVelocity.toEulerAngles()));

		physWorld.addRigidBody(this.body, cfg.collisionGroup, cfg.collisionMask);
	}

	/** updates the given transform from the physics body's interpolated transform. */
	getTransform(out_tr: Transform): void {
		// update transform from physics:
		const wTrans = new Ammo.btTransform();
		this.motionState.getWorldTransform(wTrans); // we get the interpolated transform here
		out_tr.setPosition(bullet2Vec(wTrans.getOrigin()));
		out_tr.setOrientation(bullet2Quat(wTrans.getRotation()));
	}

	/** type of associated entity */
	readonly entityType: string;
	/** the rigid body (or null if the btCollisionObject is not a btRigidBody) */
	body: Ammo.btRigidBody = null;
	/** body's motion state */
	motionState: Ammo.btDefaultMotionState = null;

	/**
	 * enables generating collision events of the associated body against other entities bodies
	 * key is entity type, value is true/false to enable/disable generating event against that entity type.
	 * For other entity types that are not configured here, the default behaviour is to not generate any event.
	 */
	readonly collisionCfg: { [entityType: string]: boolean } = {};

	/**
	 * this event is triggered when the associated body collides with another body.
	 * the event is only triggered for those other entity types that have been configured
	 * via collisionCfg (where generateEvent is true).
	 */
	readonly onCollision = new Event<(ev: CollisionEvent) => void>();

	// ------------------------- PRIAVE AREA ---------------------------//
}
