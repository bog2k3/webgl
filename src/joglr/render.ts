import { SceneGraph } from "./scene-graph";
import { Viewport } from "./viewport";

export function renderViewport(vp: Viewport, scene: SceneGraph): void {
	vp.prepareForRender();

	vp.resetAfterRender();
}