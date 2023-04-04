import Ammo from "ammojs-typed";
import { AABB } from "../joglfw/math/aabb";
import { Quat } from "../joglfw/math/quat";
import { Vector } from "../joglfw/math/vector";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { Entity } from "../joglfw/world/entity";
import { IUpdatable } from "../joglfw/world/updateable";
import { CollisionGroups } from "../physics/collision-groups";
import { bullet2Vec } from "../physics/functions";
import { CollisionEvent, PhysBodyConfig, PhysBodyProxy } from "../physics/phys-body-proxy";
import { physWorld } from "../physics/physics";
import { EntityTypes } from "./entity-types";

export class Projectile extends Entity implements IUpdatable, IRenderable {
	static readonly MASS = 10;
	static readonly COLLISION_RADIUS = 0.15;

	setInitialVelocity(vel: Vector): void {
		this.initialVelocity = vel;
	}

	getType(): string {
		return EntityTypes.Projectile;
	}

	getAABB(): AABB {
		return AABB.empty(); // TODO
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
	private initialVelocity = new Vector(0);

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
		// TODO create explosion
		this.destroy();
	}
}
