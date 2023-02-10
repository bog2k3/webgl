import { RenderContext } from "./render-context";
import { Viewport } from "./viewport";
import { IRenderable } from "./renderable";
import { IGLResource } from "./../glresource";
import { FrameBuffer, FrameBufferDescriptor } from "./frame-buffer";
import { assert } from "../utils/assert";
/*
	Use this convenience class to render to off-screen buffers/textures.
	Do all the rendering as usual, between begin() and end() methods.
	Use getFBTexture() to get the texture ID of the off-screen frame buffer.
	You need to provide a unique RenderContext (or your custom extension of that) as a parameter on the constructor.
*/
export class OffscreenRenderer implements IGLResource {
	constructor(descriptor: FrameBufferDescriptor, renderContext: RenderContext) {
		this.data_ = new OffscreenRendererData(descriptor.width, descriptor.height, renderContext);
		if (!this.data_.framebuffer.create(descriptor)) {
			throw new Error("Unable to create off-screen framebuffer!");
		}
	}

	release() {
		this.data_.release();
	}

	// set everything up for off-screen rendering
	begin(): void {
		assert(!this.data_.offscreenActive, "OffscreenRenderer already active (calling begin() twice?)");
		this.data_.framebuffer.bind();
		this.data_.offscreenActive = true;
	}

	// restore the previous framebuffer configuration
	end(): void {
		assert(this.data_.offscreenActive, "OffscreenRenderer not active (calling end() twice?)");
		this.data_.framebuffer.unbind();
		this.data_.offscreenActive = false;
	}

	// clear the render target (call this only between begin() and end())
	clear(): void {
		assert(this.data_.offscreenActive, "OffscreenRenderer not active (forgot to call begin()?)");
		this.data_.viewport.clear();
	}

	// render some stuff into the offscreen buffer (call this only between begin() and end())
	renderList(list: IRenderable[]): void {
		assert(this.data_.offscreenActive, "OffscreenRenderer not active (forgot to call begin()?)");
		this.data_.viewport.renderList(list, this.data_.renderContext);
	}

	renderElement(element: IRenderable): void {
		assert(this.data_.offscreenActive, "OffscreenRenderer not active (forgot to call begin()?)");
		this.data_.viewport.renderList([element], this.data_.renderContext);
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
}

class OffscreenRendererData implements IGLResource {
	renderContext: RenderContext;
	viewport: Viewport;

	framebuffer: FrameBuffer;

	offscreenActive = false;

	constructor(bufW: number, bufH: number, renderContext: RenderContext) {
		this.renderContext = renderContext;
		this.viewport = new Viewport(0, 0, bufW, bufH);
		this.renderContext.viewport = this.viewport;
	}

	release(): void {
		this.framebuffer.release();
		this.framebuffer = null;
	}
}
