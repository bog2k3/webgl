import { IGLResource } from './../glresource';
import { checkGLError, gl } from "../glcontext";
import { assert } from "../utils/assert";

/**
 * Describes a framebuffer's parameters.
 * depending on multisamples parameter, the behaviour is slightly different:
 * 	if [multisamples]==0 then the created framebuffer will get a texture attached as the color attachment;
 * 	if [multisamples] > 0 then the created framebuffer will get a renderbuffer attached as the color attachment;
 */
export class FrameBufferDescriptor {
	width = 256;
	height = 256;
	format = gl.RGB;
	multisamples = 0;
	requireDepthBuffer = false;

	validate(): boolean {
		let formatCorrect = false;
		const acceptedFramebufferFormats: number[] = [gl.RGB, gl.RGBA];
		for (let acceptedFormat of acceptedFramebufferFormats)
			if (this.format == acceptedFormat) {
				formatCorrect = true;
				break;
			}
		if (!formatCorrect)
			return false;
		if (this.height > 8192)
			return false;
		if (this.width > 8192)
			return false;
		if (this.multisamples > 16)
			return false;

		return true;
	}

	textureChannels(): number {
		switch (this.format) {
			case gl.RGB:
				return gl.RGB;
			case gl.RGBA:
				return gl.RGBA;

			default:
				assert(false, "invalid framebuffer format");
				return 0;
		}
	}

	textureDataType(): number {
		switch (this.format) {
			case gl.RGB:
			case gl.RGBA:
				return gl.UNSIGNED_BYTE;

			default:
				assert(false, "invalid framebuffer format");
				return 0;
		}
	}
};

// this object represents an OpenGL frame-buffer along with all its color (texture or renderbuffer) and depth (renderbuffer) attachments
export class FrameBuffer implements IGLResource {
	// returns true if this represents a valid and ready to use framebuffer.
	isValid(): boolean {
		return this.created_;
	}

	// returns true if this framebuffer is currently bound as the DRAW framebuffer.
	isActive(): boolean {
		return this.active_;
	}

	framebuffer(): WebGLFramebuffer {
		assert(this.created_, "this is an invalid framebuffer");
		return this.framebuffer_;
	}

	fbTexture(): WebGLTexture {
		assert(this.created_, "this is an invalid framebuffer");
		return this.fbTexture_;
	}

	fbRenderbuffer(): WebGLRenderbuffer {
		assert(this.created_, "this is an invalid framebuffer");
		return this.fbRenderbuffer_;
	}

	depthRenderbuffer(): WebGLRenderbuffer {
		assert(this.created_, "this is an invalid framebuffer");
		return this.depthRenderbuffer_;
	}


	// tries to create the OpenGL framebuffer resources; returns true on success and makes this object a valid framebuffer,
	// or false on failure.
	create(desc: FrameBufferDescriptor): boolean {
		assert(!this.created_, "this framebuffer has already been created!");
		if (!desc.validate()) {
			console.error("Invalid framebuffer configuration in descriptor.");
			return false;
		}
		checkGLError("Framebuffer.create()");
		this.previousFramebufferBinding_ = gl.getParameter(gl.FRAMEBUFFER_BINDING);
		this.framebuffer_ = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer_);

		if (desc.multisamples > 0) {
			this.fbTexture_ = null;
			this.fbRenderbuffer_ = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, this.fbRenderbuffer_);
			if (gl instanceof WebGL2RenderingContext) {
				gl.renderbufferStorageMultisample(gl.RENDERBUFFER, desc.multisamples, desc.format, desc.width, desc.height);
			} else {
				gl.renderbufferStorage(gl.RENDERBUFFER, desc.format, desc.width, desc.height);
			}
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.fbRenderbuffer_);
		} else {
			this.fbRenderbuffer_ = null;
			this. fbTexture_ = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, this.fbTexture_);
			gl.texImage2D(gl.TEXTURE_2D, 0, desc.format, desc.width, desc.height, 0, desc.textureChannels(), desc.textureDataType(), null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fbTexture_, 0);
		}

		if (desc.requireDepthBuffer) {
			this.depthRenderbuffer_ = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRenderbuffer_);
			if (gl instanceof WebGL2RenderingContext) {
				gl.renderbufferStorageMultisample(gl.RENDERBUFFER, desc.multisamples, gl.DEPTH24_STENCIL8, desc.width, desc.height);
			} else {
				gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, desc.width, desc.height);
			}
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.depthRenderbuffer_);
		} else
			this.depthRenderbuffer_ = null;

		const result = !checkGLError("gltCreateFrameBuffer") && gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.previousFramebufferBinding_);
		this.created_ = result;

		return result;
	}

	// bind this framebuffer as the DRAW framebuffer
	bind(): void {
		assert(this.created_, "Attempting to bind an invalid framebuffer (forgot to call create()?)");
		assert(!this.active_, "Attempting to bind a framebuffer which is already bound.");

		this.previousFramebufferBinding_ = gl.getParameter(gl.FRAMEBUFFER_BINDING);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer_);

		this.previousDepthMask_ = gl.getParameter(gl.DEPTH_WRITEMASK);
		if (this.depthRenderbuffer_)
			gl.depthMask(true);
		else
			gl.depthMask(false);

		this.active_ = true;
	}

	// unbinds this framebuffer and restores the previously bound DRAW framebuffer
	unbind(): void {
		assert(this.active_, "Attempting to unbind a framebuffer which is not bound.");
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.previousFramebufferBinding_);
		gl.depthMask(this.previousDepthMask_);

		this.active_ = false;
	}

	// binds this framebuffer as the READ framebuffer
	bindRead(): void {
		assert(gl instanceof WebGL2RenderingContext, "Framebuffer.bindRead() is not available in WebGL 1 render context");
		assert(this.created_, "Attempting to bind an invalid framebuffer (forgot to call create()?)");
		assert(!this.activeRead_, "Attempting to bind a framebuffer which is already bound.");

		if (gl instanceof WebGL2RenderingContext) {
			this.previousFramebufferBindingRead_ = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
			gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.framebuffer_);
			this.activeRead_ = true;
		}
	}

	// unbinds this framebuffer and restores the previously bound READ framebuffer
	unbindRead(): void {
		assert(gl instanceof WebGL2RenderingContext, "Framebuffer.unbindRead() is not available in WebGL 1 render context");
		assert(this.activeRead_, "Attempting to unbind a framebuffer which is not bound.");

		if (gl instanceof WebGL2RenderingContext) {
			gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.previousFramebufferBindingRead_);
			this.activeRead_ = false;
		}
	}

	// destroys the openGL resources associated with this framebuffer.
	// This is automatically called on the destructor as well, but is provided as user callable as well.
	release(): void {
		assert(this.created_, "Framebuffer::destroy(): Attempting to destroy already destroyed Framebuffer");
		assert(!this.active_ , "Attempting to destroy a framebuffer which is currently active. Unbind it first");

		if (this.fbTexture_ > 0)
			gl.deleteTexture(this.fbTexture_);
		if (this.fbRenderbuffer_)
			gl.deleteRenderbuffer(this.fbRenderbuffer_);
		if (this.depthRenderbuffer_)
			gl.deleteRenderbuffer(this.depthRenderbuffer_);
		gl.deleteRenderbuffer(this.framebuffer_);

		this.depthRenderbuffer_ = 0;
		this.fbRenderbuffer_ = 0;
		this.fbTexture_ = 0;
		this.framebuffer_ = 0;
		this.created_ = false;
	}

	// ------------------------ PRIVATE AREA ------------------------------- //
	private framebuffer_: WebGLFramebuffer;
	private fbTexture_: WebGLTexture;
	private fbRenderbuffer_: WebGLRenderbuffer;
	private depthRenderbuffer_: WebGLRenderbuffer;

	private created_ = false;
	private active_ = false;
	private activeRead_ = false;
	private previousFramebufferBinding_ = 0;
	private previousFramebufferBindingRead_ = 0;
	private previousDepthMask_ = false;
};
