import { Entity } from '../entity';
import { Matrix } from "../../joglr/math/matrix";
import { Mesh } from "../../joglr/mesh";
import { RenderContext } from "../../joglr/render-context";
import { MeshRenderer } from "../../joglr/render/mesh-renderer";
import { IRenderable } from "../renderable";

export class StaticMesh extends Entity implements IRenderable {
	constructor(
		public mesh: Mesh,
		public matW: Matrix = Matrix.identity()
	) {
		super();
	}

	render(context: RenderContext): void {
		MeshRenderer.get().render(this.mesh, this.matW, context);
	}
}