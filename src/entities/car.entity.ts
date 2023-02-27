import Ammo from "ammojs-typed";
import { AABB } from "../joglfw/math/aabb";
import { clamp } from "../joglfw/math/functions";
import { Quat } from "../joglfw/math/quat";
import { Transform } from "../joglfw/math/transform";
import { Vector } from "../joglfw/math/vector";
import { Mesh } from "../joglfw/mesh";
import { MeshRenderer } from "../joglfw/render/mesh-renderer";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { ShapeRenderer } from "../joglfw/render/shape-renderer";
import { Entity } from "../joglfw/world/entity";
import { IUpdatable } from "../joglfw/world/updateable";
import { World } from "../joglfw/world/world";
import { CollisionGroups } from "../physics/collision-groups";
import { bullet2Vec, quat2Bullet, vec2Bullet } from "../physics/functions";
import { PhysBodyConfig, PhysBodyProxy } from "../physics/phys-body-proxy";
import { physWorld } from "../physics/physics";
import { EntityTypes } from "./entity-types";
import { Terrain } from "./terrain/terrain.entity";
import { VirtualFrame } from "./virtual-frame";

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
	static readonly TURRET_MAX_ANGULAR_SPEED = Math.PI / 2;
	static readonly TURRET_MIN_PITCH = 0;
	static readonly TURRET_MAX_PITCH = Math.PI / 2.5;
	static readonly TURRET_MAX_XOZ_ERROR = 0.01; // meters at 1m distance from pivot
	static readonly TURRET_MAX_PITCH_ERROR = 0.01; // meters at 1m distance from pivot

	constructor(position: Vector, orientation: Quat) {
		super();
		this.createChassis(position, orientation);
		for (let i = 0; i < 4; i++) {
			this.createWheel(position, orientation, i);
		}
		// this.createSteeringConstraint(position);
		this.cameraFrame = new VirtualFrame(this.chassisBody);
		this.cameraFrame.localTransform.setPosition(new Vector(0, Car.LOWER_BODY_HEIGHT * 0.5));
		this.frames["camera-attachment"] = this.cameraFrame;
		this.turretFrame = new VirtualFrame(this.chassisBody);
		this.turretFrame.localTransform.setPosition(new Vector(0, Car.LOWER_BODY_HEIGHT * 0.5 + Car.UPPER_BODY_HEIGHT));
		this.frames["turret"] = this.turretFrame;
		this.turretMesh = Mesh.makeGizmo();
	}

	getType(): string {
		return EntityTypes.Car;
	}

	getAABB(): AABB {
		return AABB.empty(); // TODO implement
	}

	render(ctx: RenderContext): void {
		this.renderPlaceholders(ctx);
		this.renderCannonTrajectory(ctx);
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
		this.cameraFrame.localTransform.setOrientation(Quat.identity());
		this.turretFrame.localTransform.setOrientation(Quat.identity());
	}

	accelerate(): void {
		const torque = new Ammo.btVector3(100, 0, 0);
		this.wheelBodies[2].body.applyLocalTorque(torque);
		this.wheelBodies[3].body.applyLocalTorque(torque);

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

	rotateTarget(yaw: number, pitch: number): void {
		const chassisTransform = new Transform();
		this.chassisBody.getTransform(chassisTransform);
		this.cameraFrame.localTransform.rotateLocal(Quat.axisAngle(new Vector(1, 0, 0), pitch));
		this.cameraFrame.localTransform.rotateRef(Quat.axisAngle(new Vector(0, 1, 0), yaw));
	}

	update(dt: number): void {
		// update entity transform:
		this.chassisBody.getTransform(this.rootTransform);

		this.updateTurret(dt);
	}

	protected override getFrameTransform(frameName: string): Transform {
		if (!this.frames[frameName]) {
			throw new Error(`Non-existent frame "${frameName}" in Car entity`);
		}
		const tr = new Transform();
		this.frames[frameName].getTransform(tr);
		return tr;
	}

	// ----------------------------- PRIVATE AREA ----------------------------- //
	private chassisBody: PhysBodyProxy;
	private wheelBodies: PhysBodyProxy[] = []; // 0: front-left, 1: front-right, 2: rear-left, 3: rear-right
	private bodyShapes: Ammo.btBoxShape[] = [];
	private frames: { [name: string]: PhysBodyProxy | VirtualFrame } = {};
	private cameraFrame: VirtualFrame;

	private turretFrame: VirtualFrame;
	private turretMesh: Mesh;

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
				mass: Car.LOWER_BODY_MASS + Car.UPPER_BODY_MASS,
				friction: 0.5,
				orientation,
				collisionGroup: CollisionGroups.CAR_BODY,
				collisionMask: CollisionGroups.STATIC | CollisionGroups.CAR_BODY,
				customInertia: inertia,
			}),
		);
		this.frames["root"] = this.chassisBody;
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

		this.frames[`wheel${i}`] = this.wheelBodies[i];
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

	private updateTurret(dt: number): void {
		// the turret must rotate more slowly toward the current camera orientation
		const turretDir: Vector = this.turretFrame.localTransform.axisZ();
		const cameraDir: Vector = this.cameraFrame.localTransform.axisZ();

		const cameraDirProjected = turretDir.scale(cameraDir.dot(turretDir));
		const cameraDirDiff = cameraDir.sub(cameraDirProjected);
		if (cameraDirDiff.lengthSq() <= Number.EPSILON) {
			return; // already perfect
		}
		const yDiff: number = cameraDirDiff.y;
		const xozDiff: number = cameraDirDiff.setY(0).length();
		const yawSign: number = Math.sign(turretDir.cross(cameraDir).y);

		if (xozDiff > Car.TURRET_MAX_XOZ_ERROR) {
			this.turretFrame.localTransform.rotateRef(
				Quat.axisAngle(new Vector(0, 1, 0), Car.TURRET_MAX_ANGULAR_SPEED * yawSign * dt),
			);
		}
		if (Math.abs(yDiff) > Car.TURRET_MAX_PITCH_ERROR) {
			const turretPitch = Math.asin(turretDir.y);
			const targetPitch = clamp(
				turretPitch + Car.TURRET_MAX_ANGULAR_SPEED * Math.sign(yDiff) * dt,
				Car.TURRET_MIN_PITCH,
				Car.TURRET_MAX_PITCH,
			);
			this.turretFrame.localTransform.rotateLocal(
				Quat.axisAngle(new Vector(1, 0, 0), -(targetPitch - turretPitch)),
			);
		}
	}

	private renderPlaceholders(ctx: RenderContext): void {
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
		const turretTransform = new Transform();
		this.turretFrame.getTransform(turretTransform);
		MeshRenderer.get().render(this.turretMesh, turretTransform.glMatrix(), ctx);
	}

	private renderCannonTrajectory(ctx: RenderContext): void {
		const timeStep = 0.1; // seconds
		const v0 = 20; // initial projectile velocity, m/s
		const terrain: Terrain = World.getInstance().getGlobal<Terrain>(Terrain);
		const gravity: Vector = bullet2Vec(physWorld.getGravity());
		const turretTransform = new Transform();
		this.turretFrame.getTransform(turretTransform);
		const p0 = turretTransform.position(); // initial starting point
		const points: Vector[] = [p0];
		const v: Vector = turretTransform.axisZ().scaleInPlace(v0);
		let p: Vector = p0;
		let hitGround = false;
		while (!hitGround) {
			const nextP = p.add(v.scale(timeStep)).add(gravity.scale(timeStep * timeStep));
			const terrainHeight: number = terrain.getHeightValue(nextP);
			hitGround = terrainHeight > nextP.y;
			if (hitGround) {
				nextP.y = terrainHeight; // not 100% accurate, but not too bad and it's fast
			}
			points.push(nextP);
			v.addInPlace(gravity.scale(timeStep));
			p = nextP;
		}
		const startColor = new Vector(0, 1, 0);
		const endColor = new Vector(1, 0, 0);
		for (let i = 0; i < points.length - 1; i++) {
			const color = startColor.lerp(endColor, i / (points.length - 2));
			ShapeRenderer.get().queueLine(points[i], points[i + 1], color);
		}
	}
}
