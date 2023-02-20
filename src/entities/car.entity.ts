import Ammo from "ammojs-typed";
import { AABB } from "../joglfw/math/aabb";
import { Quat } from "../joglfw/math/quat";
import { Vector } from "../joglfw/math/vector";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { Entity } from "../joglfw/world/entity";
import { IUpdatable } from "../joglfw/world/updateable";
import { CollisionGroups } from "../physics/collision-groups";
import { quat2Bullet, vec2Bullet } from "../physics/functions";
import { PhysBodyConfig, PhysBodyProxy } from "../physics/phys-body-proxy";
import { physWorld } from "../physics/physics";
import { EntityTypes } from "./entity-types";

export class Car extends Entity implements IUpdatable, IRenderable {
	static readonly BODY_WIDTH = 1.4;
	static readonly BODY_LENGTH = 3;
	static readonly BODY_HEIGHT = 1.0;
	static readonly BODY_MASS = 200;
	static readonly WHEEL_DIAMETER = 0.625;
	static readonly WHEEL_WIDTH = 0.25;
	static readonly WHEEL_MASS = 20;
	static readonly WHEEL_X = Car.BODY_WIDTH / 2;
	static readonly FRONT_AXLE_Z = Car.BODY_LENGTH / 2 - Car.WHEEL_DIAMETER * 0.6;
	static readonly REAR_AXLE_Z = -Car.BODY_LENGTH / 2 + Car.WHEEL_DIAMETER * 0.6;
	static readonly AXLES_Y = -Car.BODY_HEIGHT / 2 - Car.WHEEL_DIAMETER * 0.8;
	static readonly WHEEL_POSTIONS = [
		new Vector(-Car.WHEEL_X, Car.AXLES_Y, Car.FRONT_AXLE_Z), // front-left
		new Vector(+Car.WHEEL_X, Car.AXLES_Y, Car.FRONT_AXLE_Z), // front-right
		new Vector(-Car.WHEEL_X, Car.AXLES_Y, Car.REAR_AXLE_Z), // rear-left
		new Vector(+Car.WHEEL_X, Car.AXLES_Y, Car.REAR_AXLE_Z), // rear-right
	];
	static readonly WHEEL_FRICTION = 0.9;
	static readonly SPRING_STIFFNESS = 5000;
	static readonly SPRING_DAMPING = 0.1;

	constructor(position: Vector, orientation: Quat) {
		super();
		this.createChassis(position, orientation);
		for (let i = 0; i < 4; i++) {
			this.createWheel(position, orientation, i);
		}
	}

	getType(): string {
		return EntityTypes.Car;
	}

	getAABB(): AABB {
		return AABB.empty(); // TODO implement
	}

	render(ctx: RenderContext): void {
		physWorld.debugDrawObject(
			this.chassisBody.body.getWorldTransform(),
			this.chassisBody.body.getCollisionShape(),
			new Ammo.btVector3(1, 0, 1),
		);
		for (let i = 0; i < 4; i++) {
			physWorld.debugDrawObject(
				this.wheelBodies[i].body.getWorldTransform(),
				this.wheelBodies[i].body.getCollisionShape(),
				new Ammo.btVector3(1, 1, 0),
			);
		}
	}

	teleport(where: Vector, orientation: Quat): void {
		const zero = new Ammo.btVector3(0, 0, 0);
		const bulletOrientation = quat2Bullet(orientation);
		this.chassisBody.body.setWorldTransform(new Ammo.btTransform(bulletOrientation, vec2Bullet(where)));
		this.chassisBody.body.clearForces();
		this.chassisBody.body.setLinearVelocity(zero);
		this.chassisBody.body.setAngularVelocity(zero);
		this.chassisBody.body.activate();
		for (let i = 0; i < 4; i++) {
			this.wheelBodies[i].body.setWorldTransform(
				new Ammo.btTransform(bulletOrientation, vec2Bullet(where.add(Car.WHEEL_POSTIONS[i]))),
			);
			this.wheelBodies[i].body.clearForces();
			this.wheelBodies[i].body.setLinearVelocity(zero);
			this.wheelBodies[i].body.setAngularVelocity(zero);
			this.wheelBodies[i].body.activate();
		}
	}

	accelerate(): void {
		const torque = new Ammo.btVector3(100, 0, 0);
		this.wheelBodies[0].body.applyLocalTorque(torque);
		this.wheelBodies[1].body.applyLocalTorque(torque);

		this.chassisBody.body.applyCentralLocalForce(new Ammo.btVector3(0, 0, 1000));
	}

	brake(): void {
		const torque = new Ammo.btVector3(-100, 0, 0);
		this.wheelBodies[0].body.applyLocalTorque(torque);
		this.wheelBodies[1].body.applyLocalTorque(torque);

		this.chassisBody.body.applyCentralLocalForce(new Ammo.btVector3(0, 0, -1000));
	}

	steerLeft(): void {}

	steerRight(): void {}

	update(dt: number): void {
		this.chassisBody.getTransform(this.transform);
	}

	// ----------------------------- PRIVATE AREA ----------------------------- //
	private chassisBody: PhysBodyProxy;
	private wheelBodies: PhysBodyProxy[] = []; // 0: front-left, 1: front-right, 2: rear-left, 3: rear-right

	createChassis(position: Vector, orientation: Quat): void {
		const bodyShape = new Ammo.btBoxShape(
			new Ammo.btVector3(Car.BODY_WIDTH * 0.5, Car.BODY_HEIGHT * 0.5, Car.BODY_LENGTH * 0.5),
		);
		this.chassisBody = new PhysBodyProxy(this);
		this.chassisBody.createBody(
			new PhysBodyConfig({
				position,
				shape: bodyShape,
				mass: Car.BODY_MASS,
				friction: 0.5,
				orientation,
				collisionGroup: CollisionGroups.CAR_BODY,
				collisionMask: CollisionGroups.STATIC | CollisionGroups.CAR_BODY,
			}),
		);
	}

	createWheel(chassisPos: Vector, chassisOrient: Quat, i: number): void {
		const wheelShape = new Ammo.btCylinderShapeX(
			new Ammo.btVector3(Car.WHEEL_WIDTH * 0.5, Car.WHEEL_DIAMETER * 0.5, Car.WHEEL_DIAMETER * 0.5),
		);
		this.wheelBodies[i] = new PhysBodyProxy(this);
		this.wheelBodies[i].createBody(
			new PhysBodyConfig({
				position: chassisPos.add(Car.WHEEL_POSTIONS[0]),
				shape: wheelShape,
				mass: Car.WHEEL_MASS,
				friction: Car.WHEEL_FRICTION,
				orientation: chassisOrient,
				collisionGroup: CollisionGroups.CAR_WHEEL,
				collisionMask: CollisionGroups.STATIC,
			}),
		);
		this.wheelBodies[i].body.setRollingFriction(Car.WHEEL_FRICTION * 2);
		const spring = new Ammo.btGeneric6DofSpringConstraint(
			this.chassisBody.body,
			this.wheelBodies[i].body,
			new Ammo.btTransform(quat2Bullet(Quat.identity()), vec2Bullet(Car.WHEEL_POSTIONS[i])),
			new Ammo.btTransform(quat2Bullet(Quat.identity()), vec2Bullet(new Vector(0))),
			false,
		);
		spring.enableSpring(1, true);
		spring.setStiffness(1, Car.SPRING_STIFFNESS);
		spring.setDamping(1, Car.SPRING_DAMPING);
		spring.setAngularLowerLimit(new Ammo.btVector3(0, 0, 0));
		spring.setAngularUpperLimit(new Ammo.btVector3(-1, 0, 0));
		spring.setLinearLowerLimit(new Ammo.btVector3(0, 0, 0));
		spring.setLinearUpperLimit(new Ammo.btVector3(0, 0.6, 0));
		spring.setEquilibriumPoint();
		physWorld.addConstraint(spring);
	}
}
