import { Camera } from "../camera";
import { Viewport } from "./viewport";

export class RenderContext {
	/** Don't alter this directly, instead use setActiveViewport() */
	activeViewport: Viewport | null;

	activeCamera(): Camera {
		return this.activeViewport?.camera();
	}

	setActiveViewport(viewport: Viewport): void {
		this.activeViewport = viewport;
		viewport.activate();
	}
}
