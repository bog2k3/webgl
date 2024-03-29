import Ammo from "ammojs-typed";
import { AABB } from "../joglfw/math/aabb";
import { Quat } from "../joglfw/math/quat";
import { Vector } from "../joglfw/math/vector";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { IUpdatable } from "../joglfw/world/updateable";
import { INetworkSerializable } from "../network/network-serializable";
import { CollisionGroups } from "../physics/collision-groups";
import { bullet2Vec, quat2Bullet, vec2Bullet } from "../physics/functions";
import { CollisionEvent, PhysBodyConfig, PhysBodyProxy } from "../physics/phys-body-proxy";
import { physWorld } from "../physics/physics";
import { CustomEntity, CustomEntityOptions } from "./custom-entity";
import { EntityTypes } from "./entity-types";
import { World } from "../joglfw/world/world";
import { DamageBroker } from "./damage-broker";
import { SplashDamage, isDestructable } from "./destructable";

export class Projectile extends CustomEntity implements IUpdatable, IRenderable, INetworkSerializable {
	static readonly MASS = 10;
	static readonly COLLISION_RADIUS = 0.15;
	static readonly MAX_DIRECT_DAMAGE = 40;
	static readonly MAX_SPLASH_DAMAGE = 60;
	static readonly MAX_SPLASH_FORCE = 4000;

	static deserialize(params: Record<string, any>): Projectile {
		if (!params.position || !params.initialVelocity) {
			throw new Error("Can't deserialize Projectile from invalid data!");
		}
		return new Projectile(Vector.fromDTO(params.position), Vector.fromDTO(params.initialVelocity), {
			isRemote: true,
		});
	}

	constructor(position: Vector, private readonly initialVelocity: Vector, options?: CustomEntityOptions) {
		super(options);
		this.rootTransform.setPosition(position);
		this.onDestroyed.add(() => this.handleDestroyed());
	}

	getType(): string {
		return EntityTypes.Projectile;
	}

	getAABB(): AABB {
		return AABB.empty(); // TODO
	}

	/** Returns a record of parameters to be sent over the network for updating the remote entity */
	getNWParameters(options?: { includeInitial?: boolean }): Record<string, any> {
		const params: any = {
			position: this.rootTransform.position(),
			velocity: bullet2Vec(this.physBody.body.getLinearVelocity()),
			orientation: this.rootTransform.orientation(),
		};
		if (options?.includeInitial) {
			params.initialVelocity = this.initialVelocity;
		}
		return params;
	}

	/** Updates the local entity with the parameters received from the network */
	setNWParameters(params: Record<string, any>): void {
		if (!params.position || !params.orientation) {
			console.warn(`Ignoring invalid network data for Projectile.setNWParams()`);
			return;
		}
		const bOrientation: Ammo.btQuaternion = quat2Bullet(params.orientation);
		const bPosition: Ammo.btVector3 = vec2Bullet(params.position);
		this.physBody.body.setWorldTransform(new Ammo.btTransform(bOrientation, bPosition));
		if (params.velocity) {
			this.physBody.body.setLinearVelocity(vec2Bullet(params.velocity));
		}
	}

	update(dt: number): void {
		this.physBody.getTransform(this.rootTransform);
		const velocityDir: Vector = bullet2Vec(this.physBody.body.getLinearVelocity()).normalizeInPlace();
		// orient the graphics transform to follow the direction of movement:
		this.rootTransform.setOrientation(Quat.fromA_to_B(Vector.axisZ(), velocityDir));
	}

	render(ctx: RenderContext): void {
		this.renderPlaceholders(ctx);
	}

	// ----------------------------- PRIVATE AREA ----------------------------- //
	private physBody: PhysBodyProxy;
	private physShape: Ammo.btCollisionShape;

	protected handleAddedToWorld(): void {
		const position: Vector = this.rootTransform.position();
		this.createBody(position, this.initialVelocity);
	}

	protected handleRemovedFromWorld(): void {
		this.physBody.destroy();
	}

	private renderPlaceholders(ctx: RenderContext): void {
		physWorld.debugDrawObject(this.physBody.body.getWorldTransform(), this.physShape, new Ammo.btVector3(1, 0, 0));
	}

	private createBody(position: Vector, velocity: Vector): void {
		this.physShape = new Ammo.btSphereShape(Projectile.COLLISION_RADIUS);
		this.physBody = new PhysBodyProxy(this);
		this.physBody.createBody(
			new PhysBodyConfig({
				friction: 1,
				mass: Projectile.MASS,
				initialVelocity: velocity,
				position: position,
				shape: this.physShape,
				orientation: Quat.fromA_to_B(Vector.axisZ(), velocity.normalize()),
				collisionGroup: CollisionGroups.PROJECTILE,
				collisionMask:
					CollisionGroups.STATIC |
					CollisionGroups.CAR_BODY |
					CollisionGroups.CAR_WHEEL |
					CollisionGroups.PROJECTILE,
			}),
		);
		this.physBody.collisionCfg[EntityTypes.Terrain] = true;
		this.physBody.collisionCfg[EntityTypes.Car] = true;
		this.physBody.onCollision.add(this.handleCollision.bind(this));
	}

	private handleCollision(ev: CollisionEvent): void {
		if (this.isRemote()) {
			return;
		}
		this.destroy();
		World.getGlobal(DamageBroker).dealSplashDamage(<SplashDamage>{
			hitNormal: ev.contacts[0].worldNormalOnOther,
			wEpicenter: ev.contacts[0].worldPointOnOther,
			maxDamage: Projectile.MAX_SPLASH_DAMAGE,
			maxForce: Projectile.MAX_SPLASH_FORCE,
		});
		if (isDestructable(ev.otherMeta.entity)) {
			ev.otherMeta.entity.takeDamage({
				directDamage: Projectile.MAX_DIRECT_DAMAGE,
			});
		}
	}

	private handleDestroyed() {
		// TODO create explosion
	}
}
