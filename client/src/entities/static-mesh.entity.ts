import { AABB } from "../joglfw/math/aabb";
import { Mesh } from "../joglfw/mesh";
import { MeshRenderer } from "../joglfw/render/mesh-renderer";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { CustomEntity } from "./custom-entity";
import { EntityTypes } from "./entity-types";

export class StaticMesh extends CustomEntity implements IRenderable {
	constructor(public mesh: Mesh) {
		super();
	}

	override getType(): string {
		return EntityTypes.StaticMesh;
	}

	override getAABB(): AABB {
		throw new Error("not implemented"); // FIXME
	}

	render(context: RenderContext): void {
		MeshRenderer.get().render(this.mesh, this.rootTransform.glMatrix(), context);
	}
}
