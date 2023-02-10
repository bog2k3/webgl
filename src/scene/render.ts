import { checkGLError } from "../joglr/glcontext";
import { RenderContext } from "../joglr/render-context";
import { Viewport } from "../joglr/viewport";
import { SceneGraph } from "./scene-graph";

export function renderViewport(vp: Viewport, scene: SceneGraph): void {
	const context = new RenderContext();
	context.activeViewport = vp;

	vp.prepareForRender();

	for (let obj of scene.getObjects()) {
		obj.render(context);
		// MeshRenderer.get().render(m, Matrix.identity(), context);
	}
	checkGLError("renderViewport");

	vp.resetAfterRender();
}