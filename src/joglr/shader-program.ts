import { IGLResource } from './../../build/joglr/glresource.d';
import { gl } from "./glcontext";
import { Shaders } from "./shaders";
import { UniformPack } from "./uniform-pack";
import { UniformPackProxy } from "./uniform-pack.proxy";
import { Event } from "./utils/event";

export class ShaderProgram implements IGLResource {

	release(): void {
		if (this.program_) {
			Shaders.deleteProgram(this.program_);
			this.program_ = null;
		}
		this.uniformPackProxies_ = [];
		this.vertexAttribs_ = [];
	}

	// Assigns a uniform pack to be used by this program.
	// This can be called multiple times with different packs, all of which will be used.
	// The method can be called before or after loading the program, but not while the program is active for rendering.
	useUniformPack(pack: UniformPack): void {
		// TODO: implement
		// uniformPackProxies_.push_back(UniformPackProxy{pack});
		// if (program_ != 0) {
		// 	// program has already been linked, let's update the uniforms mapping
		// 	uniformPackProxies_.back().updateMappings(program_);
		// }
	}

	// defines vertex attributes for this program.
	// [name] is the name of the attribute as it appears in the shader;
	// [componentType] must be one of GL_BYTE, GL_UNSIGNED_BYTE, GL_SHORT, GL_UNSIGNED_SHORT, GL_INT, GL_UNSIGNED_INT, GL_FLOAT, GL_HALF_FLOAT;
	// [componentCount] represents the number of [componentType] components within this attribute; must be 1,2,3,4
	// 		for example, for a vec3, [componentCount] is 3 and [componentType] is GL_FLOAT.
	// The vertex attribute pointers are set when calling [setupVertexStreams()].
	defineVertexAttrib(name: string, componentType: GLenum, componentCount: number): void {
		// TODO: implement
	}

	// sets up the vertex attribute pointers (each attribute name must match one of the attributes defined by [defineVertexAttrib()])
	// call this while you have bound your VAO in order to store this state within it.
	// this needs to be called only once per VAO, after the program is loaded and each time after the program is reloaded ( [onProgramReloaded] event is triggered ).
	setupVertexStreams(mapAttribSource: Record<string, VertexAttribSource>): void {
		// TODO: implement
		// assertDbg(program_ != 0 && "This ShaderProgram has not been loaded (or there was a compile/link error)!");
		// unsigned boundVBO = 0;
		// for (auto &vad : vertexAttribs_) {
		// 	auto it = mapAttribSource.find(vad.name);
		// 	if (it == mapAttribSource.end()) {
		// 		ERROR("Source for attribute '" << vad.name << "' not specified in attribute source map!");
		// 		continue;
		// 	}
		// 	const VertexAttribSource &attrSrc = it->second;
		// 	int location = glGetAttribLocation(program_, vad.name.c_str());
		// 	if (location >= 0) {
		// 		if (attrSrc.VBO != boundVBO) {
		// 			glBindBuffer(GL_ARRAY_BUFFER, attrSrc.VBO);
		// 			boundVBO = attrSrc.VBO;
		// 		}
		// 		glEnableVertexAttribArray(location);
		// 		glVertexAttribPointer(location, vad.componentCount, vad.componentType, GL_FALSE, attrSrc.stride, (void*)attrSrc.offset);
		// 	}
		// }
	}

	// loads and compiles the shaders, then links the program and fetches all uniform locations that have been mapped;
	// this should only be called one time.
	// returns true on success or false if there was an error with loading/compiling/linking the shaders.
	load(vertPath: string, fragPath: string): boolean {
		// TODO: implement
	// 	assertDbg(program_ == 0 && "This ShaderProgram has already been loaded!");
	// 	if (geomPath.empty()) {
	// 		Shaders::createProgram(vertPath.c_str(), fragPath.c_str(), std::bind(&ShaderProgram::onProgramLinked, this, std::placeholders::_1));
	// 	} else {
	// 		Shaders::createProgramGeom(vertPath.c_str(), geomPath.c_str(), fragPath.c_str(), std::bind(&ShaderProgram::onProgramLinked, this, std::placeholders::_1));
	// 	}
	// #ifdef DEBUG
	// 	vertPath_ = vertPath;
	// 	fragPath_ = fragPath;
	// 	geomPath_ = geomPath;
	// #endif
	// 	return program_ != 0;
	}

	// destroys all openGL resources associated with this object and removes all uniform packs and vertex attribute descriptors.
	// this is automatically called on destructor.
	// It is safe to call it more than once.

	// sets this program up for rendering. This will also push all uniform values from all
	// assigned uniform packs into the openGL pipeline
	begin(): void {
		// TODO: implement
		// assertDbg(program_ != 0 && "This ShaderProgram has not been loaded (or there was a compile/link error)!");
		// glUseProgram(program_);
		// for (auto &pack : uniformPackProxies_)
		// 	pack.pushValues();
	}

	// resets the openGL state after you finished rendering with this program.
	end(): void {
		gl.useProgram(null);
	}

	// checks whether this object contains a valid openGL shader program that has been successfuly loaded and linked.
	isValid(): boolean {
		return this.program_ !== null;
	}

	// returns the gl location of a uniform identified by name.
	// This call is only allowed after the program has been loaded.
	getUniformLocation(uName: string): WebGLUniformLocation {
		// TODO: implement
		// assertDbg(program_ != 0 && "This ShaderProgram has not been loaded (or there was a compile/link error)!");
		// return glGetUniformLocation(program_, uName);
	}

	// this event is triggered whith a reference to this object every time the shader program has been successfully linked.
	// This happens the first time the program is loaded and on subsequent Shader::reloadAllShaders() calls.
	onProgramReloaded = new Event<(prog: ShaderProgram) => void>;

	// --------------------- PRIVATE AREA ------------------------ //

	program_: WebGLProgram = null;
	uniformPackProxies_: UniformPackProxy[] = [];
	vertexAttribs_: VertexAttribDescriptor[] = [];

	onProgramLinked(programId: WebGLProgram): void {
		// TODO: implement
		// program_ = programId;
		// if (programId != 0) {
		// 	for (auto &pack : uniformPackProxies_)
		// 		pack.updateMappings(programId);

		// 	onProgramReloaded.trigger(std::ref(*this));
		// }
	}

	vertPath_: string;
	fragPath_: string;
}

class VertexAttribSource {
	VBO: WebGLBuffer;	// VBO to stream a vertex attribute from
	stride: number;		// stride of the vertex attribute within the VBO
	offset: number;		// offset of the first vertex attribute from the start of the buffer
};

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
};