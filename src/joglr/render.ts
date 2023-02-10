import { checkGLError } from "./glcontext";
import { Matrix } from "./math/matrix";
import { RenderContext } from "./render-context";
import { MeshRenderer } from "./render/mesh-renderer";
import { SceneGraph } from "./scene-graph";
import { Viewport } from "./viewport";

export function renderViewport(vp: Viewport, scene: SceneGraph): void {
	const context = new RenderContext();
	context.activeViewport = vp;

	vp.prepareForRender();

	for (let m of scene.testMeshes) {
		MeshRenderer.get().renderMesh(m, Matrix.identity(), context);
		checkGLError("renderViewport");
	}

	vp.resetAfterRender();
}