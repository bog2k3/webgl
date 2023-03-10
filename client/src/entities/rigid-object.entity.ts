import Ammo from "ammojs-typed";
import { AABB } from "../joglfw/math/aabb";
import { Quat } from "../joglfw/math/quat";
import { Vector } from "../joglfw/math/vector";
import { Mesh } from "../joglfw/mesh";
import { MeshRenderer } from "../joglfw/render/mesh-renderer";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { Entity } from "../joglfw/world/entity";
import { IUpdatable } from "../joglfw/world/updateable";
import { PhysBodyConfig, PhysBodyProxy } from "../physics/phys-body-proxy";
import { EntityTypes } from "./entity-types";

export class RigidObject extends Entity implements IRenderable, IUpdatable {
	constructor(
		public mesh: Mesh,
		position: Vector,
		shape: Ammo.btCollisionShape,
		mass: number,
		initialVelocity?: Vector,
		initialAngularVelocity?: Quat,
	) {
		super();
		this.physBodyProxy.createBody(
			new PhysBodyConfig({
				position,
				shape,
				initialVelocity,
				initialAngularVelocity,
				mass,
			}),
		);
	}

	override getType(): string {
		return EntityTypes.RigidObject;
	}

	override getAABB(): AABB {
		throw new Error("not implemented"); // FIXME
	}

	render(context: RenderContext): void {
		MeshRenderer.get().render(this.mesh, this.rootTransform.glMatrix(), context);
	}

	update(dt: number): void {
		this.physBodyProxy.getTransform(this.rootTransform);
	}

	// -------------------- PRIVATE AREA ---------------------------- //
	physBodyProxy = new PhysBodyProxy(this);
}
