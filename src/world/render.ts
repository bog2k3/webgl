import { checkGLError } from "../joglr/glcontext";
import { RenderContext } from "../joglr/render-context";
import { Viewport } from "../joglr/viewport";
import { World } from "./world";

export function renderViewport(vp: Viewport, world: World): void {
	const context = new RenderContext();
	context.activeViewport = vp;

	vp.prepareForRender();
	world.render(context);
	checkGLError("renderViewport");

	vp.resetAfterRender();
}