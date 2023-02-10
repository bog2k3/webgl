import { RenderPass } from './../render/custom-render-context';
import { checkGLError } from "../joglr/glcontext";
import { Viewport } from "../joglr/viewport";
import { CustomRenderContext } from "../render/custom-render-context";
import { World } from "./world";

export function renderViewport(vp: Viewport, world: World): void {
	const context = new CustomRenderContext();
	context.renderPass = RenderPass.Standard;
	context.activeViewport = vp;

	vp.prepareForRender();
	world.render(context);
	checkGLError("renderViewport");

	vp.resetAfterRender();
}