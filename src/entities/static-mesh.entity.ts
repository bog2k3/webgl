import { Mesh } from "../joglr/mesh";
import { MeshRenderer } from "../joglr/render/mesh-renderer";
import { RenderContext } from "../joglr/render/render-context";
import { IRenderable } from "../joglr/render/renderable";
import { Entity } from "../joglr/world/entity";
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
