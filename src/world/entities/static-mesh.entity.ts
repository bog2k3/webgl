import { Entity } from '../entity';
import { Matrix } from "../../joglr/math/matrix";
import { Mesh } from "../../joglr/mesh";
import { RenderContext } from "../../joglr/render-context";
import { MeshRenderer } from "../../joglr/render/mesh-renderer";
import { IRenderable } from "../../joglr/renderable";
import { EntityType } from "./entity-types";

export class StaticMesh extends Entity implements IRenderable {
	constructor(
		public mesh: Mesh,
		public matW: Matrix = Matrix.identity()
	) {
		super();
	}

	override getType(): EntityType {
		return EntityType.StaticMesh;
	}

	render(context: RenderContext): void {
		MeshRenderer.get().render(this.mesh, this.matW, context);
	}
}