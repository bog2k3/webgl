import { Matrix } from "../joglr/math/matrix";
import { Mesh } from "../joglr/mesh";
import { RenderContext } from "../joglr/render-context";
import { MeshRenderer } from "../joglr/render/mesh-renderer";
import { IRenderable } from "../scene/renderable";

export class StaticMeshObject implements IRenderable {
	constructor(public mesh: Mesh, public matW: Matrix = Matrix.identity()) {}

	render(context: RenderContext): void {
		MeshRenderer.get().render(this.mesh, this.matW, context);
	}
}