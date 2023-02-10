import { IGLResource } from './../../build/joglr/glresource.d';

export class ShaderProgram implements IGLResource {

	release(): void {
		// TODO: implement
	}

	// Assigns a uniform pack to be used by this program.
	// This can be called multiple times with different packs, all of which will be used.
	// The method can be called before or after loading the program, but not while the program is active for rendering.
	useUniformPack(pack: UniformPack): void;

	// defines vertex attributes for this program.
	// [name] is the name of the attribute as it appears in the shader;
	// [componentType] must be one of GL_BYTE, GL_UNSIGNED_BYTE, GL_SHORT, GL_UNSIGNED_SHORT, GL_INT, GL_UNSIGNED_INT, GL_FLOAT, GL_HALF_FLOAT;
	// [componentCount] represents the number of [componentType] components within this attribute; must be 1,2,3,4
	// 		for example, for a vec3, [componentCount] is 3 and [componentType] is GL_FLOAT.
	// The vertex attribute pointers are set when calling [setupVertexStreams()].
	void defineVertexAttrib(std::string name, int componentType, unsigned componentCount);

	// sets up the vertex attribute pointers (each attribute name must match one of the attributes defined by [defineVertexAttrib()])
	// call this while you have bound your VAO in order to store this state within it.
	// this needs to be called only once per VAO, after the program is loaded and each time after the program is reloaded ( [onProgramReloaded] event is triggered ).
	void setupVertexStreams(std::map<std::string, VertexAttribSource> const& mapAttribSource);

	// loads and compiles the shaders, then links the program and fetches all uniform locations that have been mapped;
	// this should only be called one time.
	// returns true on success or false if there was an error with loading/compiling/linking the shaders.
	bool load(std::string const& vertPath, std::string const& fragPath, std::string const& geomPath="");

	// destroys all openGL resources associated with this object and removes all uniform packs and vertex attribute descriptors.
	// this is automatically called on destructor.
	// It is safe to call it more than once.
	void reset();

	// sets this program up for rendering. This will also push all uniform values from all
	// assigned uniform packs into the openGL pipeline
	void begin();

	// resets the openGL state after you finished rendering with this program.
	void end();

	// checks whether this object contains a valid openGL shader program that has been successfuly loaded and linked.
	bool isValid() const { return programId_ != 0; }

	// returns the gl location of a uniform identified by name.
	// This call is only allowed after the program has been loaded.
	int getUniformLocation(const char* uName);

	// this event is triggered whith a reference to this object every time the shader program has been successfully linked.
	// This happens the first time the program is loaded and on subsequent Shader::reloadAllShaders() calls.
	Event<void(ShaderProgram const&)> onProgramReloaded;

protected:
	unsigned programId_ = 0;
	std::vector<UniformPackProxy> uniformPackProxies_;

	struct VertexAttribDescriptor;
	std::vector<VertexAttribDescriptor> vertexAttribs_;

	void onProgramLinked(unsigned programId);

#ifdef DEBUG
	std::string vertPath_;
	std::string fragPath_;
}