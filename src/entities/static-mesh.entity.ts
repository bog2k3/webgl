import { Matrix } from "../joglr/math/matrix";
import { Mesh } from "../joglr/mesh";
import { MeshRenderer } from "../joglr/render/mesh-renderer";
import { RenderContext } from "../joglr/render/render-context";
import { IRenderable } from "../joglr/render/renderable";
import { Entity } from "../joglr/world/entity";
import { EntityType } from "./entity-types";

export class StaticMesh extends Entity implements IRenderable {
	constructor(public mesh: Mesh, public matW: Matrix = Matrix.identity()) {
		super();
	}

	override getType(): EntityType {
		return EntityType.StaticMesh;
	}

	render(context: RenderContext): void {
		MeshRenderer.get().render(this.mesh, this.matW, context);
	}
}
