import { Mesh } from "../joglfw/mesh";
import { MeshRenderer } from "../joglfw/render/mesh-renderer";
import { RenderContext } from "../joglfw/render/render-context";
import { IRenderable } from "../joglfw/render/renderable";
import { Entity } from "../joglfw/world/entity";
import { EntityTypes } from "./entity-types";

export class StaticMesh extends Entity implements IRenderable {
	constructor(public mesh: Mesh) {
		super();
	}

	override getType(): string {
		return EntityTypes.StaticMesh;
	}

	render(context: RenderContext): void {
		MeshRenderer.get().render(this.mesh, this.transform_.glMatrix(), context);
	}
}
