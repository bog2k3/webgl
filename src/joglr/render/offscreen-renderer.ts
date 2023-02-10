import { RenderContext } from './../render-context';
import { Viewport } from './../viewport';
import { IRenderable } from './../../world/renderable';
import { IGLResource } from './../glresource';
import { FrameBuffer, FrameBufferDescriptor } from "./frame-buffer";
/*
	Use this convenience class to render to off-screen buffers/textures.
	Do all the rendering as usual, between begin() and end() methods.
	Use getFBTexture() to get the texture ID of the off-screen frame buffer.
	You need to provide a unique RenderContext (or your custom extension of that) as a parameter on the constructor.
*/
export class OffscreenRenderer implements IGLResource {
	constructor(descriptor: FrameBufferDescriptor, renderContext: RenderContext) {
		this.data_ = new OffscreenRendererData(
			descriptor.width,
			descriptor.height,
			renderContext
		);
		if (!this.data_.framebuffer.create(descriptor)) {
			throw new Error("Unable to create off-screen framebuffer!");
		}
	}

	release() {
		throw new Error("not implemented"); // TODO implement
	}

	// set everything up for off-screen rendering
	begin(): void {
		throw new Error("not implemented"); // TODO implement
	}

	// clear the render target (call this only between begin() and end())
	clear(): void {
		throw new Error("not implemented"); // TODO implement
	}

	// render some stuff into the offscreen buffer (call this only between begin() and end())
	renderList(list: IRenderable[]): void {
		throw new Error("not implemented"); // TODO implement
	}

	renderElement(element: IRenderable): void {
		throw new Error("not implemented"); // TODO implement
	}

	// restore the previous framebuffer configuration
	end(): void {
		throw new Error("not implemented"); // TODO implement
	}

	viewport(): Viewport {
		return this.data_.viewport;
	}

	getFBTexture(): WebGLTexture {
		return this.data_.framebuffer.fbTexture();
	}

	getRenderContext(): RenderContext {
		return this.data_.renderContext;
	}

	// ------------------------ PRIVATE AREA ------------------------------- //

	data_: OffscreenRendererData = null;
};

class OffscreenRendererData {
	renderContext: RenderContext;
	viewport: Viewport;

	framebuffer: FrameBuffer;

	offscreenActive = false;

	constructor(bufW: number, bufH: number, renderContext: RenderContext) {
		this.renderContext = renderContext;
		this.viewport = new Viewport(0, 0, bufW, bufH);
		this.renderContext.activeViewport = this.viewport;
	}
}
