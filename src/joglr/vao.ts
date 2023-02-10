import { gl } from "./glcontext";
import { IGLResource } from "./glresource";
/**
 * This class abstracts a GL VAO.
 * For WebGL 2 contexts, it's implemented with native VAOs,
 * but for WebGL 1 it simulates the same behaviour using normal
 * buffer and vertex attrib pointer calls.
 */
export class VertexArrayObject implements IGLResource {
	constructor() {
		if (gl instanceof WebGL2RenderingContext) {
			this.nativeVAO = gl.createVertexArray();
		}
	}

	release(): void {
		if (gl instanceof WebGL2RenderingContext) {
			gl.deleteVertexArray(this.nativeVAO);
		}
	}

	bind(): void {
		if (gl instanceof WebGL2RenderingContext) {
			gl.bindVertexArray(this.nativeVAO);
		} else {
			this.bindLegacy();
		}
	}

	unbind(): void {
		if (gl instanceof WebGL2RenderingContext) {
			gl.bindVertexArray(null);
		} else {
			this.unbindLegacy();
		}
	}

	/**
	 * Calls the original gl.vertexAttribPointer with the same parameters, also calls gl.enableVertexAttribArray(index).
	 * If native VAOs are not available, this also records the information so it is replayed when this
	 * VAO is bound the next time
	 */
	vertexAttribPointer(
		index: number,
		size: number,
		type: GLenum,
		normalized: boolean,
		stride: number,
		offset: number,
	): void {
		if (!(gl instanceof WebGL2RenderingContext)) {
			this.vertexSources[index] = <VertexSourceDesc>{
				VBO: gl.getParameter(gl.ARRAY_BUFFER_BINDING),
				size,
				type,
				normalized,
				stride,
				offset,
			};
		}
		gl.enableVertexAttribArray(index);
		gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
	}

	// --------------- PRIVATE AREA --------------------- //
	private nativeVAO: WebGLVertexArrayObject;
	private vertexSources: { [index: number]: VertexSourceDesc } = {};

	private bindLegacy(): void {
		for (let indexStr in this.vertexSources) {
			const index = Number.parseInt(indexStr);
			gl.enableVertexAttribArray(index);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexSources[index].VBO);
			gl.vertexAttribPointer(
				index,
				this.vertexSources[index].size,
				this.vertexSources[index].type,
				this.vertexSources[index].normalized,
				this.vertexSources[index].stride,
				this.vertexSources[index].offset,
			);
		}
	}

	private unbindLegacy(): void {
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		for (let indexStr in this.vertexSources) {
			const index = Number.parseInt(indexStr);
			gl.disableVertexAttribArray(index);
		}
	}
}

class VertexSourceDesc {
	VBO: WebGLBuffer;
	size: number;
	type: GLenum;
	normalized: boolean;
	stride: number;
	offset: number;
}
