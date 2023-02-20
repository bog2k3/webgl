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
	static readonly UPPER_BODY_WIDTH = 1.0;
	static readonly UPPER_BODY_LENGTH = 2.0;
	static readonly UPPER_BODY_HEIGHT = 0.9;
	static readonly UPPER_BODY_MASS = 100;
	static readonly LOWER_BODY_WIDTH = 1.4;
	static readonly LOWER_BODY_LENGTH = 3.0;
	static readonly LOWER_BODY_HEIGHT = 0.5;
	static readonly LOWER_BODY_MASS = 300;
	static readonly WHEEL_DIAMETER = 0.625;
	static readonly WHEEL_WIDTH = 0.25;
	static readonly WHEEL_MASS = 20;
	static readonly WHEEL_X = Car.LOWER_BODY_WIDTH / 2;
	static readonly FRONT_AXLE_Z = Car.LOWER_BODY_LENGTH / 2 - Car.WHEEL_DIAMETER * 0.6;
	static readonly REAR_AXLE_Z = -Car.LOWER_BODY_LENGTH / 2 + Car.WHEEL_DIAMETER * 0.6;
	static readonly AXLES_Y = -Car.LOWER_BODY_HEIGHT / 2 - Car.WHEEL_DIAMETER * 0.6;
	static readonly WHEEL_POSTIONS = [
		new Vector(-Car.WHEEL_X, Car.AXLES_Y, Car.FRONT_AXLE_Z), // front-left
		new Vector(+Car.WHEEL_X, Car.AXLES_Y, Car.FRONT_AXLE_Z), // front-right
		new Vector(-Car.WHEEL_X, Car.AXLES_Y, Car.REAR_AXLE_Z), // rear-left
		new Vector(+Car.WHEEL_X, Car.AXLES_Y, Car.REAR_AXLE_Z), // rear-right
	];
	static readonly WHEEL_FRICTION = 0.9;
	static readonly SPRING_STIFFNESS = (Car.LOWER_BODY_MASS + Car.UPPER_BODY_MASS) * 12.5;
	static readonly SPRING_DAMPING = 0.0001;
	static readonly STEERING_STIFFNESS = 50000;
	static readonly STEERING_DAMPING = 0.01;
	static readonly STEERING_MAX_ANGLE = Math.PI / 8;

	constructor(position: Vector, orientation: Quat) {
		super();
		this.createChassis(position, orientation);
		for (let i = 0; i < 4; i++) {
			this.createWheel(position, orientation, i);
		}
		// this.createSteeringConstraint(position);
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
			this.bodyShapes[0],
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

	steerLeft(): void {
		const torque = new Ammo.btVector3(0, -100, 0);
		this.wheelBodies[0].body.applyTorque(torque);
		this.wheelBodies[1].body.applyTorque(torque);
	}

	steerRight(): void {
		const torque = new Ammo.btVector3(0, +100, 0);
		this.wheelBodies[0].body.applyTorque(torque);
		this.wheelBodies[1].body.applyTorque(torque);
	}

	update(dt: number): void {
		this.chassisBody.getTransform(this.transform);
	}

	// ----------------------------- PRIVATE AREA ----------------------------- //
	private chassisBody: PhysBodyProxy;
	private wheelBodies: PhysBodyProxy[] = []; // 0: front-left, 1: front-right, 2: rear-left, 3: rear-right
	private bodyShapes: Ammo.btBoxShape[] = [];

	private createChassis(position: Vector, orientation: Quat): void {
		const lowerChassisShape = new Ammo.btBoxShape(
			new Ammo.btVector3(Car.LOWER_BODY_WIDTH * 0.5, Car.LOWER_BODY_HEIGHT * 0.5, Car.LOWER_BODY_LENGTH * 0.5),
		);
		this.bodyShapes[0] = lowerChassisShape;
		const inertia = new Ammo.btVector3();
		lowerChassisShape.calculateLocalInertia(Car.LOWER_BODY_MASS + Car.UPPER_BODY_MASS, inertia);

		const upperChassisShape = new Ammo.btBoxShape(
			new Ammo.btVector3(Car.UPPER_BODY_WIDTH * 0.5, Car.UPPER_BODY_HEIGHT * 0.5, Car.UPPER_BODY_LENGTH * 0.5),
		);
		this.bodyShapes[1] = upperChassisShape;

		const compoundShape = new Ammo.btCompoundShape();
		compoundShape.addChildShape(new Ammo.btTransform(), lowerChassisShape);
		compoundShape.addChildShape(
			new Ammo.btTransform(
				new Ammo.btQuaternion(0, 0, 0, 1),
				new Ammo.btVector3(0, (Car.LOWER_BODY_HEIGHT + Car.UPPER_BODY_HEIGHT) * 0.5, 0),
			),
			upperChassisShape,
		);
		this.chassisBody = new PhysBodyProxy(this);
		this.chassisBody.createBody(
			new PhysBodyConfig({
				position,
				shape: compoundShape,
				// shape: lowerChassisShape,
				mass: Car.LOWER_BODY_MASS + Car.UPPER_BODY_MASS,
				friction: 0.5,
				orientation,
				collisionGroup: CollisionGroups.CAR_BODY,
				collisionMask: CollisionGroups.STATIC | CollisionGroups.CAR_BODY,
				customInertia: inertia,
			}),
		);
	}

	private createWheel(chassisPos: Vector, chassisOrient: Quat, i: number): void {
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
		let steerAngle = 0;
		if (i < 2) {
			spring.enableSpring(2, true);
			spring.setStiffness(2, Car.STEERING_STIFFNESS);
			spring.setDamping(2, Car.STEERING_DAMPING);
			steerAngle = Car.STEERING_MAX_ANGLE;
		}
		spring.setAngularLowerLimit(new Ammo.btVector3(0, -steerAngle, 0));
		spring.setAngularUpperLimit(new Ammo.btVector3(-1, +steerAngle, 0));
		spring.setLinearLowerLimit(new Ammo.btVector3(0, 0, 0));
		spring.setLinearUpperLimit(new Ammo.btVector3(0, Car.WHEEL_DIAMETER, 0));
		spring.setEquilibriumPoint();
		physWorld.addConstraint(spring);
	}

	/** Constrains the two front wheels to only steer together at the same angle */
	private createSteeringConstraint(chassisPos: Vector): void {
		// TODO cannot constrain points on tire because they rotate differently.
		// TODO must find another solution
		const conrodWidth = Car.WHEEL_POSTIONS[1].x - Car.WHEEL_POSTIONS[0].x;
		const conrodBody = new PhysBodyProxy(this);
		conrodBody.createBody(
			new PhysBodyConfig({
				mass: 1,
				position: chassisPos.add(new Vector(0, Car.AXLES_Y, Car.FRONT_AXLE_Z + Car.WHEEL_DIAMETER * 0.5)),
				shape: new Ammo.btBoxShape(new Ammo.btVector3(conrodWidth * 0.5, 0.01, 0.01)),
				collisionGroup: CollisionGroups.CAR_WHEEL,
			}),
		);
		const wheelPoint = new Ammo.btVector3(0, 0, Car.WHEEL_DIAMETER * 0.5);
		physWorld.addConstraint(
			new Ammo.btPoint2PointConstraint(
				this.wheelBodies[0].body,
				conrodBody.body,
				wheelPoint,
				new Ammo.btVector3(-conrodWidth * 0.5, 0, 0),
			),
		);
		physWorld.addConstraint(
			new Ammo.btPoint2PointConstraint(
				this.wheelBodies[1].body,
				conrodBody.body,
				wheelPoint,
				new Ammo.btVector3(+conrodWidth * 0.5, 0, 0),
			),
		);
	}
}
