import { VertexArrayObject } from "./vao";
import { gl } from "../glcontext";
import { IGLResource } from "../glresource";
import { Shaders } from "./shaders";
import { UniformPack } from "./uniform-pack";
import { UniformPackProxy } from "./uniform-pack.proxy";
import { Event } from "../utils/event";

export class ShaderProgram implements IGLResource {
	release(): void {
		if (this.program) {
			Shaders.deleteProgram(this.program);
			this.program = null;
		}
		this.uniformPackProxies = [];
		this.vertexAttribs = [];
	}

	// Assigns a uniform pack to be used by this program.
	// This can be called multiple times with different packs, all of which will be used.
	// The method can be called before or after loading the program, but not while the program is active for rendering.
	useUniformPack(pack: UniformPack): void {
		this.uniformPackProxies.push(new UniformPackProxy(pack));
		if (this.program != null) {
			// program has already been linked, let's update the uniforms mapping
			this.uniformPackProxies[this.uniformPackProxies.length - 1].updateMappings(this.program);
		}
	}

	// defines vertex attributes for this program.
	// [name] is the name of the attribute as it appears in the shader;
	// [componentType] must be one of GL_BYTE, GL_UNSIGNED_BYTE, GL_SHORT, GL_UNSIGNED_SHORT, GL_INT, GL_UNSIGNED_INT, GL_FLOAT, GL_HALF_FLOAT;
	// [componentCount] represents the number of [componentType] components within this attribute; must be 1,2,3,4
	//   for example, for a vec3, [componentCount] is 3 and [componentType] is GL_FLOAT.
	// The vertex attribute pointers are set when calling [setupVertexStreams()].
	defineVertexAttrib(name: string, componentType: GLenum, componentCount: number): void {
		if (!VertexAttribDescriptor.validateParams(componentType)) {
			throw new Error("Invalid vertex attribute type!");
		}
		this.vertexAttribs.push(<VertexAttribDescriptor>{
			name,
			componentType,
			componentCount,
		});
	}

	// sets up the vertex attribute pointers (each attribute name must match one of the attributes defined by [defineVertexAttrib()])
	// call this while you have bound your VAO in order to store this state within it.
	// this needs to be called only once per VAO, after the program is loaded and each time after the program is reloaded ( [onProgramReloaded] event is triggered ).
	setupVertexStreams(vao: VertexArrayObject, mapAttribSource: Record<string, VertexAttribSource>): void {
		if (!this.isValid()) {
			throw new Error("This ShaderProgram has not been loaded (or there was a compile/link error)!");
		}
		vao.bind();
		let boundVBO: WebGLBuffer = null;
		for (let vAttrDesc of this.vertexAttribs) {
			const attrSrc: VertexAttribSource = mapAttribSource[vAttrDesc.name];
			if (!attrSrc) {
				console.error(`Source for attribute '${vAttrDesc.name}' not specified in attribute source map!`);
				continue;
			}
			const location: number = gl.getAttribLocation(this.program, vAttrDesc.name);
			if (location >= 0) {
				if (attrSrc.VBO != boundVBO) {
					gl.bindBuffer(gl.ARRAY_BUFFER, attrSrc.VBO);
					boundVBO = attrSrc.VBO;
				}
				vao.vertexAttribPointer(
					location,
					vAttrDesc.componentCount,
					vAttrDesc.componentType,
					false,
					attrSrc.stride,
					attrSrc.offset,
				);
			}
		}
		vao.unbind();
	}

	// loads and compiles the shaders, then links the program and fetches all uniform locations that have been mapped;
	// this should only be called one time.
	// returns true on success or false if there was an error with loading/compiling/linking the shaders.
	async load(vertPath: string, fragPath: string): Promise<boolean> {
		if (this.program) {
			throw new Error("This ShaderProgram has already been loaded!");
		}
		await Shaders.createProgram(vertPath, fragPath, this.onProgramLinked.bind(this));
		this.vertPath_ = vertPath;
		this.fragPath_ = fragPath;
		return this.isValid();
	}

	// sets this program up for rendering. This will also push all uniform values from all
	// assigned uniform packs into the openGL pipeline
	begin(): void {
		if (!this.isValid()) {
			throw new Error("This ShaderProgram has not been loaded (or there was a compile/link error)!");
		}
		gl.useProgram(this.program);
		for (let pack of this.uniformPackProxies) {
			pack.pushValues();
		}
	}

	// resets the openGL state after you finished rendering with this program.
	end(): void {
		gl.useProgram(null);
	}

	// checks whether this object contains a valid openGL shader program that has been successfuly loaded and linked.
	isValid(): boolean {
		return this.program !== null;
	}

	// returns the gl location of a uniform identified by name.
	// This call is only allowed after the program has been loaded.
	getUniformLocation(uName: string): WebGLUniformLocation {
		if (!this.isValid()) {
			throw new Error("This ShaderProgram has not been loaded (or there was a compile/link error)!");
		}
		return gl.getUniformLocation(this.program, uName);
	}

	// this event is triggered whith a reference to this object every time the shader program has been successfully linked.
	// This happens the first time the program is loaded and on subsequent Shader::reloadAllShaders() calls.
	onProgramReloaded = new Event<(prog: ShaderProgram) => void>();

	// --------------------- PRIVATE AREA ------------------------ //

	private program: WebGLProgram = null;
	private uniformPackProxies: UniformPackProxy[] = [];
	private vertexAttribs: VertexAttribDescriptor[] = [];

	private onProgramLinked(program: WebGLProgram): void {
		this.program = program;
		if (program !== null) {
			for (let pack of this.uniformPackProxies) {
				pack.updateMappings(program);
			}

			this.onProgramReloaded.trigger(this);
		}
	}

	private vertPath_: string;
	private fragPath_: string;
}

export class VertexAttribSource {
	VBO: WebGLBuffer; // VBO to stream a vertex attribute from
	stride: number; // stride of the vertex attribute within the VBO
	offset: number; // offset of the first vertex attribute from the start of the buffer
}

class VertexAttribDescriptor {
	name: string;
	componentType: GLenum;
	componentCount: number;

	static validateParams(type: GLenum): boolean {
		switch (type) {
			case gl.BYTE:
			case gl.UNSIGNED_BYTE:
			case gl.SHORT:
			case gl.UNSIGNED_SHORT:
			case gl.INT:
			case gl.UNSIGNED_INT:
			case gl.FLOAT:
				return true;
			default:
				return false;
		}
	}
}
